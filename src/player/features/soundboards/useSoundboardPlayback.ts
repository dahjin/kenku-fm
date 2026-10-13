import { useCallback, useEffect, useRef } from "react";

import { useDispatch, useSelector, useStore } from "react-redux";
import { RootState } from "../../app/store";
import {
  playSound,
  setWaiting,
  stopGroup,
  updateGroup,
  updatePlayback,
  stopSound,
} from "./soundboardPlaybackSlice";
import { Sound as SoundType } from "./soundboardsSlice";
import { Sound } from "./Sound";
import { SoundGroupPlayer } from "./SoundGroupPlayer";

export function useSoundboardPlayback(onError: (message: string) => void) {
  const soundsRef = useRef<Record<string, Sound>>({});
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const groupsRef = useRef<Record<string, SoundGroupPlayer>>({});
  const activeScene = useSelector(
    (state: RootState) => state.scenePlayback.active,
  );
  const activeGroups = useSelector(
    (state: RootState) => state.soundboardPlayback.groups,
  );
  const activeSoundCount = useSelector(
    (state: RootState) => Object.keys(state.soundboardPlayback.playback).length,
  );
  const boards = useSelector(
    (state: RootState) => state.soundboards.soundboards,
  );
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const library = useSelector((state: RootState) => state.soundboards.sounds);

  useEffect(() => {
    for (const [id, player] of Object.entries(groupsRef.current)) {
      if (!activeGroups[id]) {
        player.stop();
        delete groupsRef.current[id];
      }
    }
    for (const id of Object.keys(activeGroups)) {
      if (groupsRef.current[id]) continue;
      const player = new SoundGroupPlayer({
        group: () => {
          const state = store.getState();
          const group = Object.values(state.soundboards.soundboards.byId)
            .flatMap((board) => board.groups ?? [])
            .find((group) => group.id === id);
          const preset = state.scenePlayback.active?.tab.groups.find(
            (item) => item.groupId === id,
          );
          return group && preset
            ? { ...group, interval: preset.interval }
            : group;
        },
        sound: (soundId) => {
          const state = store.getState();
          const sound = state.soundboards.sounds[soundId];
          const preset = state.scenePlayback.active?.tab.groups.find(
            (item) => item.groupId === id,
          );
          return sound && preset
            ? { ...sound, volume: sound.volume * preset.volume }
            : sound;
        },
        status: (waiting, soundId) =>
          dispatch(updateGroup({ id, waiting, soundId })),
        finish: () => dispatch(stopGroup(id)),
        error: (message) => errorRef.current(message),
      });
      groupsRef.current[id] = player;
      player.start();
    }
  }, [activeGroups, store, dispatch]);

  useEffect(() => {
    for (const player of Object.values(groupsRef.current)) player.update();
  }, [boards, library, activeScene]);

  useEffect(
    () => () => {
      for (const [id, player] of Object.entries(groupsRef.current)) {
        player.stop();
        dispatch(stopGroup(id));
      }
      groupsRef.current = {};
    },
    [dispatch],
  );

  const play = useCallback(
    (sound: SoundType) => {
      if (soundsRef.current[sound.id]) {
        soundsRef.current[sound.id].removeAllListeners();
        soundsRef.current[sound.id].stop(false);
        delete soundsRef.current[sound.id];
      }

      const playback = new Sound({
        src: sound.url,
        volume: sound.volume,
        fadeIn: sound.fadeIn,
        fadeOut: sound.fadeOut,
        loop: sound.loop,
        repeatInterval: sound.repeatInterval,
        lowPassHz: sound.lowPassHz,
        reverbMix: sound.reverbMix,
      });

      playback.once("load", (duration) => {
        dispatch(
          playSound({
            sound,
            duration: Math.floor(duration),
          }),
        );
      });

      playback.on("waiting", () =>
        dispatch(setWaiting({ id: sound.id, waiting: true })),
      );
      playback.on("playing", () =>
        dispatch(setWaiting({ id: sound.id, waiting: false })),
      );
      playback.on("end", () => {
        if (soundsRef.current[sound.id] !== playback) return;
        dispatch(stopSound(sound.id));
        delete soundsRef.current[sound.id];
        playback.removeAllListeners();
        void playback.stop(false);
      });

      playback.on("error", () => {
        if (soundsRef.current[sound.id] !== playback) return;
        playback.removeAllListeners();
        void playback.stop(false);
        delete soundsRef.current[sound.id];
        dispatch(stopSound(sound.id));
        onError(`Unable to play sound: ${sound.title}`);
      });

      soundsRef.current[sound.id] = playback;
    },
    [onError],
  );

  useEffect(() => {
    if (!activeSoundCount) return;
    // The UI animates between these readings, so checking once per second is
    // enough and avoids waking the renderer on every animation frame.
    const handler = setInterval(() => {
      const updates: { id: string; progress: number }[] = [];
      for (const id in soundsRef.current) {
        const sound = soundsRef.current[id];
        if (sound.playing()) {
          updates.push({ id, progress: sound.progress() });
        }
      }
      if (updates.length > 0) dispatch(updatePlayback(updates));
    }, 1000);
    return () => clearInterval(handler);
  }, [activeSoundCount, dispatch]);

  const seek = useCallback((id: string, to: number) => {
    dispatch(updatePlayback([{ id, progress: to }]));
    soundsRef.current[id]?.seek(to);
  }, []);

  const stop = useCallback(async (id: string, seconds?: number) => {
    dispatch(stopSound(id));
    const loop = soundsRef.current[id];
    if (loop) {
      delete soundsRef.current[id];
      loop.removeAllListeners();
      if (seconds !== undefined) loop.options.fadeOut = seconds * 1000;
      await loop.stop(true);
    }
  }, []);

  // Removing a sound/board also cancels any pending repeat.
  useEffect(() => {
    for (const id of Object.keys(soundsRef.current)) {
      if (!library[id]) void stop(id);
    }
  }, [library, stop]);

  useEffect(
    () => () => {
      for (const [id, sound] of Object.entries(soundsRef.current)) {
        sound.removeAllListeners();
        void sound.stop(false);
        dispatch(stopSound(id));
      }
      soundsRef.current = {};
    },
    [dispatch],
  );

  // Sync function for updating the currently playing sounds with the redux store
  // Used in `SoundboardPlaybackSync`
  const sync = useCallback((update: (id: string, sound: Sound) => void) => {
    for (const [id, sound] of Object.entries(soundsRef.current)) {
      update(id, sound);
    }
  }, []);

  const volume = useCallback((id: string, value: number) => {
    soundsRef.current[id]?.volume(value);
  }, []);

  const has = useCallback((id: string) => Boolean(soundsRef.current[id]), []);

  return {
    has,
    volume,
    seek,
    play,
    stop,
    sync,
  };
}
