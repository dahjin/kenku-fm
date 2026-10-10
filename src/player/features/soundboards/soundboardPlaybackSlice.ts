import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Sound } from "./soundboardsSlice";

export interface SoundPlayback extends Sound {
  waiting?: boolean;
  progress: number;
  duration: number;
}

export interface PlaylistPlaybackState {
  groups: Record<string, { title: string; waiting: boolean; soundId?: string }>;
  playback: Record<string, SoundPlayback>;
}

const initialState: PlaylistPlaybackState = {
  playback: {},
  groups: {},
};

export const soundboardPlaybackSlice = createSlice({
  name: "soundboardPlayback",
  initialState,
  reducers: {
    startGroup: (
      state,
      action: PayloadAction<{ id: string; title: string }>,
    ) => {
      state.groups[action.payload.id] = {
        title: action.payload.title,
        waiting: false,
      };
    },
    stopGroup: (state, action: PayloadAction<string>) => {
      delete state.groups[action.payload];
    },
    updateGroup: (
      state,
      action: PayloadAction<{ id: string; waiting: boolean; soundId?: string }>,
    ) => {
      if (state.groups[action.payload.id])
        Object.assign(state.groups[action.payload.id], action.payload);
    },
    playSound: (
      state,
      action: PayloadAction<{ sound: Sound; duration: number }>,
    ) => {
      const { sound, duration } = action.payload;
      state.playback[sound.id] = { ...sound, progress: 0, duration };
    },
    setWaiting: (
      state,
      action: PayloadAction<{ id: string; waiting: boolean }>,
    ) => {
      const sound = state.playback[action.payload.id];
      if (sound) {
        sound.waiting = action.payload.waiting;
        sound.progress = 0;
      }
    },
    stopSound: (state, action: PayloadAction<string>) => {
      delete state.playback[action.payload];
    },
    updatePlayback: (
      state,
      action: PayloadAction<{ id: string; progress: number }[]>,
    ) => {
      const updates = action.payload;
      for (const { id, progress } of updates) {
        if (id in state.playback) {
          state.playback[id].progress = progress;
        }
      }
    },
  },
});

export const {
  playSound,
  stopSound,
  updatePlayback,
  setWaiting,
  startGroup,
  stopGroup,
  updateGroup,
} = soundboardPlaybackSlice.actions;

export default soundboardPlaybackSlice.reducer;
