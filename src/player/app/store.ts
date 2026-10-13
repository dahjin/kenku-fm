import { combineReducers, configureStore } from "@reduxjs/toolkit";
import playlistsReducer from "../features/playlists/playlistsSlice";
import soundboardsReducer from "../features/soundboards/soundboardsSlice";
import playlsitPlaybackReducer from "../features/playlists/playlistPlaybackSlice";
import soundboardPlaybackReducer from "../features/soundboards/soundboardPlaybackSlice";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import type { PersistedState } from "redux-persist";
import storage from "redux-persist/lib/storage";
import {
  loadSceneBackup,
  restoreSceneBackup,
  saveSceneBackup,
} from "../features/scenes/scenePersistence";
import type { SceneLibrary } from "../features/scenes/scenePersistence";

const playbackPersistConfig = {
  key: "playback",
  version: 1,
  storage,
  whitelist: ["volume", "muted", "shuffle", "repeat"],
};

import scenesReducer, {
  scenePlaybackReducer,
} from "../features/scenes/scenesSlice";

const sceneBackup = loadSceneBackup(globalThis.localStorage);
type PersistedPlayerState = Exclude<PersistedState, undefined> & {
  scenes?: SceneLibrary;
};
const protectedScenesReducer: typeof scenesReducer = (state, action) =>
  scenesReducer(state ?? sceneBackup, action);

const rootReducer = combineReducers({
  scenes: protectedScenesReducer,
  scenePlayback: scenePlaybackReducer,
  playlists: playlistsReducer,
  soundboards: soundboardsReducer,
  playlistPlayback: persistReducer(
    playbackPersistConfig,
    playlsitPlaybackReducer,
  ),
  soundboardPlayback: soundboardPlaybackReducer,
});

const persistConfig = {
  key: "player",
  version: 1,
  storage,
  whitelist: ["playlists", "soundboards", "scenes"],
  migrate: async (persistedState: PersistedState): Promise<PersistedState> =>
    restoreSceneBackup(
      persistedState as PersistedPlayerState | undefined,
      sceneBackup,
    ),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

let savedScenes: RootState["scenes"] | undefined;
store.subscribe(() => {
  const state = store.getState();
  if (!state._persist.rehydrated || state.scenes === savedScenes) return;
  savedScenes = state.scenes;
  saveSceneBackup(globalThis.localStorage, state.scenes);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
