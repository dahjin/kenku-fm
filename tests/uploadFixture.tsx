import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import playlists, {
  addPlaylist,
} from "../src/player/features/playlists/playlistsSlice";
import soundboards, {
  addSoundboard,
} from "../src/player/features/soundboards/soundboardsSlice";
import playlistPlayback from "../src/player/features/playlists/playlistPlaybackSlice";
import { TrackAdd } from "../src/player/features/playlists/TrackAdd";
import { SoundAdd } from "../src/player/features/soundboards/SoundAdd";
import { Playlist } from "../src/player/features/playlists/Playlist";
import { Soundboard } from "../src/player/features/soundboards/Soundboard";
import soundboardPlayback from "../src/player/features/soundboards/soundboardPlaybackSlice";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const store = configureStore({
  reducer: { playlists, soundboards, playlistPlayback, soundboardPlayback },
});
store.dispatch(
  addPlaylist({
    id: "playlist",
    title: "Test playlist",
    tracks: [],
    background: "",
  }),
);
store.dispatch(
  addSoundboard({
    id: "board",
    title: "Test board",
    sounds: [],
    background: "",
  }),
);
Object.assign(window, { uploadTestStore: store });
const sounds = location.hash.includes("sounds");
const page = location.hash.includes("page");
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    {page ? (
      <MemoryRouter
        initialEntries={[sounds ? "/soundboards/board" : "/playlists/playlist"]}
      >
        <Routes>
          <Route
            path="/soundboards/:soundboardId"
            element={<Soundboard onPlay={() => {}} onStop={() => {}} />}
          />
          <Route
            path="/playlists/:playlistId"
            element={<Playlist onPlay={() => {}} />}
          />
        </Routes>
      </MemoryRouter>
    ) : sounds ? (
      <SoundAdd soundboardId="board" open onClose={() => {}} />
    ) : (
      <TrackAdd playlistId="playlist" open onClose={() => {}} />
    )}
  </Provider>,
);
