import { useCallback, useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { RootState } from "../../app/store";
import {
  playPause,
  playTrack,
  updatePlayback,
  updateQueue,
} from "./playlistPlaybackSlice";
import { Track } from "./playlistsSlice";
import { getFilteredTracks, getPlaybackIndex } from "./playlistTags";
import { SmartShufflePlanner, smartShuffleEnabled } from "./smartShuffle";
import { PlaylistAudio } from "./PlaylistAudio";

export function usePlaylistPlayback(onError: (message: string) => void) {
  const store = useStore<RootState>();
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const engine = useRef<PlaylistAudio>();
  const planner = useRef(new SmartShufflePlanner());
  const manualTrack = useRef<string>();

  function candidate(direction: 1 | -1, restartCurrent = false) {
    const state = store.getState();
    const playback = state.playlistPlayback;
    const queue = playback.queue;
    const playlist = queue && state.playlists.playlists.byId[queue.playlistId];
    if (!queue || !playlist) return undefined;
    const eligible = getFilteredTracks(playlist, state.playlists.tracks).filter(
      (id) => queue.tracks.includes(id),
    );
    if (smartShuffleEnabled(playlist, playback.shuffle, playback.repeat)) {
      const currentId = playback.track?.id;
      const id =
        restartCurrent && eligible.includes(currentId)
          ? currentId
          : planner.current.choose(
              direction,
              playlist,
              state.playlists.tracks,
              eligible,
              playback.recentByPlaylist?.[playlist.id] ?? [],
            );
      return id
        ? {
            index: queue.shuffled.indexOf(queue.tracks.indexOf(id)),
            track: state.playlists.tracks[id],
          }
        : undefined;
    }
    const index = getPlaybackIndex(
      queue,
      playback.shuffle,
      playback.repeat,
      getFilteredTracks(playlist, state.playlists.tracks),
      direction,
      restartCurrent,
    );
    if (index === undefined) return undefined;
    const id = queue.tracks[playback.shuffle ? queue.shuffled[index] : index];
    return { index, track: state.playlists.tracks[id] };
  }

  if (!engine.current)
    engine.current = new PlaylistAudio({
      next: () => candidate(1)?.track,
      crossfade: () => {
        const state = store.getState();
        return (
          state.playlists.playlists.byId[
            state.playlistPlayback.queue?.playlistId
          ]?.crossfadeSeconds ?? 0
        );
      },
      onStart: (track, duration, playing) => {
        const { queue, shuffle } = store.getState().playlistPlayback;
        if (queue) {
          planner.current.commit(
            queue.playlistId,
            track.id,
            manualTrack.current === track.id,
          );
          const index = queue.tracks.indexOf(track.id);
          if (index >= 0)
            store.dispatch(
              updateQueue(shuffle ? queue.shuffled.indexOf(index) : index),
            );
        }
        manualTrack.current = undefined;
        store.dispatch(playTrack({ track, duration }));
        if (!playing) store.dispatch(playPause(false));
      },
      onProgress: (seconds) => store.dispatch(updatePlayback(seconds)),
      onStop: () => {
        store.dispatch(playPause(false));
        store.dispatch(
          updatePlayback(
            store.getState().playlistPlayback.track?.startSeconds ?? 0,
          ),
        );
      },
      onError: (message) => errorRef.current(message),
    });

  useEffect(() => {
    const timer = setInterval(() => engine.current.tick(), 50);
    return () => {
      clearInterval(timer);
      engine.current.dispose();
    };
  }, []);

  const play = useCallback(
    (track: Track, transitionSeconds?: number) => {
      const state = store.getState().playlistPlayback;
      engine.current.volume(state.volume);
      engine.current.mute(state.muted);
      manualTrack.current = track.id;
      if (state.queue) planner.current.clearPending(state.queue.playlistId);
      engine.current.play(track, false, transitionSeconds);
    },
    [store],
  );
  const advance = useCallback(
    (direction: 1 | -1) => {
      const playback = store.getState().playlistPlayback;
      const next = candidate(
        direction,
        direction === -1 &&
          playback.playback?.progress - (playback.track?.startSeconds ?? 0) >=
            5,
      );
      if (!next?.track) {
        engine.current.stop();
        return;
      }
      const playlist =
        store.getState().playlists.playlists.byId[playback.queue?.playlistId];
      const smart =
        playlist &&
        smartShuffleEnabled(playlist, playback.shuffle, playback.repeat);
      const restarting =
        direction === -1 &&
        playback.playback?.progress - (playback.track?.startSeconds ?? 0) >= 5;
      if (next.track.id === playback.track?.id && (!smart || restarting))
        engine.current.seek(0);
      else {
        manualTrack.current = undefined;
        engine.current.play(next.track);
      }
    },
    [store, play],
  );

  return {
    play,
    seek: useCallback((seconds: number) => engine.current.seek(seconds), []),
    next: useCallback(() => advance(1), [advance]),
    previous: useCallback(() => advance(-1), [advance]),
    retainCurrent: useCallback(() => engine.current.retainCurrent(), []),
    fadeOut: useCallback(
      (seconds: number) => engine.current.fadeOut(seconds),
      [],
    ),
    stop: useCallback(() => engine.current.stop(), []),
    pauseResume: useCallback(
      (resume: boolean) => engine.current.pauseResume(resume),
      [],
    ),
    mute: useCallback((value: boolean) => engine.current.mute(value), []),
    volume: useCallback((value: number) => engine.current.volume(value), []),
  };
}
