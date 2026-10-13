import assert from "node:assert/strict";
import test from "node:test";
import {
  loadSceneBackup,
  restoreSceneBackup,
  saveSceneBackup,
  SCENE_BACKUP_KEY,
  SceneLibrary,
} from "../src/player/features/scenes/scenePersistence";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const scenes: SceneLibrary = {
  allIds: ["razor-bay"],
  byId: {
    "razor-bay": {
      id: "razor-bay",
      title: "Razor Bay",
      tabs: [
        {
          id: "day",
          title: "Day",
          transitionSeconds: 2,
          sounds: [],
          groups: [],
        },
      ],
    },
  },
};

test("scene backup survives independently from the shared player record", () => {
  const storage = new MemoryStorage();
  saveSceneBackup(storage, scenes);
  storage.setItem("persist:player", JSON.stringify({ playlists: "{}" }));
  assert.deepEqual(loadSceneBackup(storage), scenes);
  assert.equal(storage.values.has(SCENE_BACKUP_KEY), true);
});

test("a backup replaces a stale root scene value without removing the field", () => {
  const stale = { scenes: { byId: {}, allIds: [] }, playlists: {} };
  const restored = restoreSceneBackup(stale, scenes);
  assert.deepEqual(restored, { scenes, playlists: {} });
  assert.notEqual(restored, stale);
  assert.equal(restoreSceneBackup(stale, undefined), stale);
});

test("missing or malformed backups fall back to redux-persist", () => {
  const storage = new MemoryStorage();
  assert.equal(loadSceneBackup(storage), undefined);
  storage.setItem(SCENE_BACKUP_KEY, "not json");
  assert.equal(loadSceneBackup(storage), undefined);
  storage.setItem(SCENE_BACKUP_KEY, JSON.stringify({ allIds: "bad", byId: {} }));
  assert.equal(loadSceneBackup(storage), undefined);
});
