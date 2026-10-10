import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RepeatInterval } from "../soundboards/repeatInterval";

export interface SceneTab {
  id: string;
  title: string;
  transitionSeconds: number;
  music?: { playlistId: string; tags: string[]; volume: number };
  sounds: { soundId: string; volume: number }[];
  groups: { groupId: string; volume: number; interval: RepeatInterval }[];
}
export interface Scene {
  background?: string;
  id: string;
  title: string;
  tabs: SceneTab[];
}
export interface ActiveScene {
  sceneId: string;
  sceneTitle: string;
  tab: SceneTab;
}

const scenes = createSlice({
  name: "scenes",
  initialState: { byId: {} as Record<string, Scene>, allIds: [] as string[] },
  reducers: {
    saveScene(state, action: PayloadAction<Scene>) {
      if (!state.byId[action.payload.id]) state.allIds.push(action.payload.id);
      state.byId[action.payload.id] = action.payload;
    },
    moveSceneTab(
      state,
      action: PayloadAction<{ sceneId: string; active: string; over: string }>,
    ) {
      const tabs = state.byId[action.payload.sceneId]?.tabs;
      if (!tabs) return;
      const from = tabs.findIndex((tab) => tab.id === action.payload.active);
      const to = tabs.findIndex((tab) => tab.id === action.payload.over);
      if (from < 0 || to < 0 || from === to) return;
      const [tab] = tabs.splice(from, 1);
      tabs.splice(to, 0, tab);
    },
    removeScene(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
      state.allIds = state.allIds.filter((id) => id !== action.payload);
    },
  },
});
export const { saveScene, removeScene, moveSceneTab } = scenes.actions;
export default scenes.reducer;

// Deliberately separate from persisted definitions: opening the app never autoplays.
const playback = createSlice({
  name: "scenePlayback",
  initialState: { active: null as ActiveScene | null },
  reducers: {
    activateScene(state, action: PayloadAction<ActiveScene>) {
      // Snapshot so subsequent saved edits cannot alter the live mix.
      state.active = JSON.parse(JSON.stringify(action.payload)) as ActiveScene;
    },
    stopScene(state) {
      state.active = null;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(removeScene, (state, action) => {
      if (state.active?.sceneId === action.payload) state.active = null;
    }),
});
export const { activateScene, stopScene } = playback.actions;
export const scenePlaybackReducer = playback.reducer;
