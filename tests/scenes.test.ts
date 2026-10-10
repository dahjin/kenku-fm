import { strict as assert } from "node:assert";
import { test } from "node:test";
import { configureStore } from "@reduxjs/toolkit";
import scenes, {
  activateScene,
  removeScene,
  moveSceneTab,
  saveScene,
  scenePlaybackReducer,
  SceneTab,
  stopScene,
} from "../src/player/features/scenes/scenesSlice";
import playlists, {
  addPlaylist,
  addTrack,
} from "../src/player/features/playlists/playlistsSlice";
import soundboards, {
  addSoundboard,
  addSound,
} from "../src/player/features/soundboards/soundboardsSlice";
import playlistPlayback, {
  playTrack,
} from "../src/player/features/playlists/playlistPlaybackSlice";
import soundboardPlayback from "../src/player/features/soundboards/soundboardPlaybackSlice";
import { SceneController } from "../src/player/features/scenes/SceneController";
import type { RootState } from "../src/player/app/store";

const day: SceneTab = {
  id: "day",
  title: "Day",
  transitionSeconds: 2,
  music: { playlistId: "bay", tags: ["day"], volume: 0.5 },
  sounds: [{ soundId: "sea", volume: 0.5 }],
  groups: [
    {
      groupId: "birds",
      volume: 0.7,
      interval: { minSeconds: 5, maxSeconds: 10 },
    },
  ],
};
function setup() {
  const store = configureStore({
    reducer: {
      scenes,
      scenePlayback: scenePlaybackReducer,
      playlists,
      soundboards,
      playlistPlayback,
      soundboardPlayback,
    },
  });
  store.dispatch(
    addPlaylist({ id: "bay", title: "Bay", tracks: [], background: "" }),
  );
  for (const id of ["day", "night"])
    store.dispatch(
      addTrack({
        playlistId: "bay",
        track: { id, title: id, url: id, tags: [id] },
      }),
    );
  store.dispatch(
    addSoundboard({
      id: "s",
      title: "S",
      background: "",
      sounds: [],
      groups: [
        {
          id: "birds",
          title: "Birds",
          soundIds: ["sea"],
          interval: { minSeconds: 1, maxSeconds: 2 },
        },
      ],
    }),
  );
  for (const id of ["sea", "wind", "manual"])
    store.dispatch(
      addSound({
        soundboardId: "s",
        sound: {
          id,
          title: id,
          url: id,
          volume: 1,
          loop: false,
          fadeIn: 0,
          fadeOut: 0,
        },
      }),
    );
  const started: string[] = [],
    stopped: string[] = [],
    tracks: string[] = [],
    volumes: number[] = [];
  const live = new Set<string>();
  let fades = 0;
  const controller = new SceneController({
    state: () => store.getState() as RootState,
    dispatch: store.dispatch,
    sounds: {
      has: (id) => live.has(id),
      play: (sound) => {
        live.add(sound.id);
        started.push(sound.id);
      },
      stop: (id) => {
        live.delete(id);
        stopped.push(id);
      },
      volume: (_, value) => volumes.push(value),
    },
    music: {
      retainCurrent: () => {},
      play: (track) => {
        tracks.push(track.id);
        store.dispatch(playTrack({ track, duration: 100 }));
      },
      fadeOut: () => fades++,
    },
  });
  function activate(tab = day) {
    const active = { sceneId: "razor", sceneTitle: "Razor Bay", tab };
    store.dispatch(activateScene(active));
    controller.apply(store.getState().scenePlayback.active);
  }
  return {
    store,
    controller,
    activate,
    started,
    stopped,
    tracks,
    volumes,
    live,
    fades: () => fades,
  };
}

test("editing saved tabs doesn't activate playback or modify an activated snapshot", () => {
  const f = setup();
  f.store.dispatch(saveScene({ id: "razor", title: "Razor Bay", tabs: [day] }));
  assert.equal(f.store.getState().scenePlayback.active, null);
  f.activate();
  f.store.dispatch(
    saveScene({
      id: "razor",
      title: "Razor Bay",
      tabs: [{ ...day, sounds: [] }],
    }),
  );
  assert.equal(f.store.getState().scenePlayback.active.tab.sounds.length, 1);
  assert.deepEqual(f.stopped, []);
});

test("switching tabs retains shared ambience even while it is loading", () => {
  const f = setup();
  f.activate();
  f.activate({
    ...day,
    id: "night",
    sounds: [
      { soundId: "sea", volume: 0.2 },
      { soundId: "wind", volume: 1 },
    ],
  });
  assert.deepEqual(f.started, ["sea", "wind"]);
  assert.deepEqual(f.stopped, []);
  assert.deepEqual(f.volumes, [0.2]);
  assert.deepEqual(f.tracks, ["day"]);
});

test("tab music applies AND tag filtering and transitions to matching tracks", () => {
  const f = setup();
  f.activate();
  f.activate({ ...day, id: "night", music: { ...day.music, tags: ["night"] } });
  assert.deepEqual(f.tracks, ["day", "night"]);
  assert.deepEqual(f.store.getState().playlists.playlists.byId.bay.tagFilter, [
    "night",
  ]);
  assert.equal(f.store.getState().playlistPlayback.volume, 0.5);
});

test("stop removes only scene sounds and groups and fades its music", () => {
  const f = setup();
  f.live.add("manual");
  f.activate();
  f.store.dispatch(stopScene());
  f.controller.apply(null);
  assert.deepEqual(f.stopped, ["sea"]);
  assert.equal(f.live.has("manual"), true);
  assert.deepEqual(f.store.getState().soundboardPlayback.groups, {});
  assert.equal(f.fades(), 1);
});

test("empty tag matches fade the previous music and don't start an unrelated track", () => {
  const f = setup();
  f.activate();
  f.activate({ ...day, music: { ...day.music, tags: ["missing"] } });
  assert.deepEqual(f.tracks, ["day"]);
  assert.equal(f.fades(), 1);
});

test("missing references are skipped without throwing", () => {
  const f = setup();
  f.activate({
    ...day,
    music: { ...day.music, playlistId: "missing" },
    sounds: [{ soundId: "missing", volume: 1 }],
    groups: [{ ...day.groups[0], groupId: "missing" }],
  });
  assert.deepEqual(f.started, []);
  assert.deepEqual(f.tracks, []);
  assert.deepEqual(f.store.getState().soundboardPlayback.groups, {});
});

test("scene activation never edits shared sound and group definitions", () => {
  const f = setup();
  const before = f.store.getState().soundboards;
  f.activate();
  assert.equal(f.store.getState().soundboards, before);
});

test("deleting the active scene clears its runtime activation", () => {
  const f = setup();
  f.activate();
  f.store.dispatch(removeScene("razor"));
  assert.equal(f.store.getState().scenePlayback.active, null);
});

test("reactivation after stop restarts music rather than leaving its fade-out running", () => {
  const f = setup();
  f.activate();
  f.controller.apply(null);
  f.activate();
  assert.deepEqual(f.tracks, ["day", "day"]);
});

test("tab reordering preserves tab IDs, shared references and the active snapshot", () => {
  const f = setup();
  const night = { ...day, id: "night", title: "Night" };
  const tension = { ...day, id: "tension", title: "Tension" };
  f.store.dispatch(
    saveScene({ id: "razor", title: "Razor Bay", tabs: [day, night, tension] }),
  );
  f.activate(day);
  const snapshot = f.store.getState().scenePlayback.active;
  f.store.dispatch(
    moveSceneTab({ sceneId: "razor", active: "day", over: "tension" }),
  );
  assert.deepEqual(
    f.store.getState().scenes.byId.razor.tabs.map((tab) => tab.id),
    ["night", "tension", "day"],
  );
  assert.equal(f.store.getState().scenePlayback.active, snapshot);
  assert.deepEqual(f.store.getState().scenes.byId.razor.tabs[2], day);
  assert.deepEqual(f.stopped, []);
});

test("stale or missing drag targets cannot remove tabs", () => {
  const f = setup();
  f.store.dispatch(saveScene({ id: "razor", title: "Razor Bay", tabs: [day] }));
  const before = f.store.getState().scenes;
  for (const value of [
    { sceneId: "razor", active: "day", over: "missing" },
    { sceneId: "razor", active: "missing", over: "day" },
    { sceneId: "missing", active: "day", over: "night" },
    { sceneId: "razor", active: "day", over: "day" },
  ])
    f.store.dispatch(moveSceneTab(value));
  assert.equal(f.store.getState().scenes, before);
});
