import React, { useEffect } from "react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Sound } from "./Sound";

type SoundboardPlaybackSyncProps = {
  onSync: (update: (id: string, sound: Sound) => void) => void;
};

// Sync soundboard redux store and playback
// This is done in a empty component to avoid re-rendering any children
// which is important for high performance live volume updating
export function SoundboardPlaybackSync({
  onSync,
}: SoundboardPlaybackSyncProps) {
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const soundboards = useSelector((state: RootState) => state.soundboards);

  useEffect(() => {
    onSync((id, sound) => {
      const source = soundboards.sounds[id];
      const preset = active?.tab.sounds.find((item) => item.soundId === id);
      const state =
        source && preset
          ? {
              ...source,
              volume: preset.volume,
              loop: true,
              repeatInterval: null,
            }
          : source;
      if (state) {
        if (state.volume !== sound.options.volume) {
          sound.volume(state.volume);
        }
        const loop = state.repeatInterval ? false : state.loop;
        if (loop !== sound.options.loop) sound.loop(loop);
        sound.repeat(state.repeatInterval);
        if (
          state.lowPassHz !== sound.options.lowPassHz ||
          state.reverbMix !== sound.options.reverbMix
        )
          sound.effects(state);
      }
    });
  }, [soundboards, active, onSync]);

  return <></>;
}
