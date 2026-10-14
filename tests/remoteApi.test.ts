import test from "node:test";
import assert from "node:assert/strict";
import { get as httpGet, ServerResponse } from "node:http";
import Fastify from "fastify";
import type { RootState } from "../src/player/app/store";
import type { PlayerManager } from "../src/main/managers/PlayerManager";
import {
  createRemoteSnapshot,
  createRemoteSnapshotUpdate,
} from "../src/player/remote/remoteSnapshot";
import { v2 } from "../src/main/remote/routes/v2";
import { REMOTE_API_VERSION, RemoteSnapshot } from "../src/types/remote";

function sourceState(): RootState {
  return {
    playlists: {
      playlists: {
        allIds: ["playlist-1"],
        byId: {
          "playlist-1": {
            id: "playlist-1",
            title: "Tavern",
            background: "/private/art/tavern.png",
            tracks: ["track-1"],
            tagFilter: ["creepy"],
            smartShuffle: true,
            avoidRecent: 3,
            tagPriorities: { creepy: 2 },
            crossfadeSeconds: 4,
          },
        },
      },
      tracks: {
        "track-1": {
          id: "track-1",
          title: "Uneasy Inn",
          url: "/private/audio/uneasy.ogg",
          tags: ["tavern", "creepy"],
          frequency: 2,
          lowPassHz: 1400,
          reverbMix: 0.2,
        },
      },
    },
    playlistPlayback: {
      playing: true,
      volume: 0.8,
      muted: false,
      shuffle: true,
      repeat: "playlist",
      queue: {
        current: 0,
        tracks: ["track-1"],
        shuffled: [0],
        playlistId: "playlist-1",
      },
      track: {
        id: "track-1",
        title: "Uneasy Inn",
        url: "/private/audio/uneasy.ogg",
        tags: ["tavern", "creepy"],
      },
      playback: { duration: 90, progress: 12 },
    },
    soundboards: {
      soundboards: {
        allIds: ["board-1"],
        byId: {
          "board-1": {
            id: "board-1",
            title: "Forge",
            background: "/private/art/forge.png",
            sounds: ["sound-1"],
            groups: [
              {
                id: "group-1",
                title: "Blacksmith",
                soundIds: ["sound-1"],
                interval: { minSeconds: 5, maxSeconds: 12 },
              },
            ],
          },
        },
      },
      sounds: {
        "sound-1": {
          id: "sound-1",
          title: "Hammer",
          url: "/private/audio/hammer.ogg",
          loop: false,
          volume: 0.7,
          fadeIn: 0,
          fadeOut: 0,
          startSeconds: 0.5,
          endSeconds: 1.8,
          lowPassHz: 900,
          reverbMix: 0.35,
        },
      },
    },
    soundboardPlayback: {
      playback: {
        "sound-1": {
          id: "sound-1",
          title: "Hammer",
          url: "/private/audio/hammer.ogg",
          loop: false,
          volume: 0.7,
          fadeIn: 0,
          fadeOut: 0,
          progress: 1,
          duration: 2,
        },
      },
      groups: {
        "group-1": { title: "Blacksmith", waiting: true },
      },
    },
    scenes: {
      allIds: ["scene-1"],
      byId: {
        "scene-1": {
          id: "scene-1",
          title: "Razor Bay",
          background: "/private/art/razor-bay.png",
          tabs: [
            {
              id: "tab-1",
              title: "Night",
              transitionSeconds: 2,
              music: {
                playlistId: "playlist-1",
                tags: ["creepy"],
                volume: 0.8,
              },
              sounds: [{ soundId: "sound-1", volume: 0.5 }],
              groups: [
                {
                  groupId: "group-1",
                  volume: 1,
                  interval: { minSeconds: 5, maxSeconds: 12 },
                },
              ],
            },
          ],
        },
      },
    },
    scenePlayback: {
      active: {
        sceneId: "scene-1",
        sceneTitle: "Razor Bay",
        tab: {
          id: "tab-1",
          title: "Night",
          transitionSeconds: 2,
          sounds: [],
          groups: [],
        },
      },
    },
  } as unknown as RootState;
}

function snapshot(): RemoteSnapshot {
  return {
    apiVersion: REMOTE_API_VERSION,
    sequence: 4,
    updatedAt: "2026-10-12T12:00:00.000Z",
    ...createRemoteSnapshot(sourceState()),
  };
}

test("v2 snapshot exposes library and runtime features without local paths", () => {
  const value = snapshot();
  assert.deepEqual(value.library.playlists[0].availableTags, [
    "creepy",
    "tavern",
  ]);
  assert.equal(value.library.soundboards[0].groups[0].title, "Blacksmith");
  assert.equal(value.library.tracks[0].lowPassHz, 1400);
  assert.equal(value.library.tracks[0].reverbMix, 0.2);
  assert.equal(value.library.sounds[0].lowPassHz, 900);
  assert.equal(value.library.sounds[0].reverbMix, 0.35);
  assert.equal(value.library.sounds[0].startSeconds, 0.5);
  assert.equal(value.library.sounds[0].endSeconds, 1.8);
  assert.equal(value.library.scenes[0].tabs[0].id, "tab-1");
  assert.equal(value.state.playlist.track?.progress, 12);
  assert.equal(value.state.scene?.tabTitle, "Night");
  assert.equal(value.state.soundboard.groups[0].waiting, true);
  const json = JSON.stringify(value);
  assert.equal(json.includes("/private/"), false);
  assert.equal(json.includes('"url"'), false);
  assert.equal(json.includes('"background"'), false);
});

test("playback progress snapshots reuse the unchanged remote library", () => {
  const state = sourceState();
  const first = createRemoteSnapshot(state);
  const next = {
    ...state,
    playlistPlayback: {
      ...state.playlistPlayback,
      playback: { duration: 90, progress: 13 },
    },
  } as RootState;
  const second = createRemoteSnapshot(next);
  const update = createRemoteSnapshotUpdate(second, first.library);

  assert.equal(second.library, first.library);
  assert.equal(second.state.playlist.track?.progress, 13);
  assert.equal(update.library, undefined);
  assert.equal(update.state.playlist.track?.progress, 13);

  const changedLibraryState = {
    ...next,
    playlists: {
      ...next.playlists,
      tracks: {
        ...next.playlists.tracks,
        "track-1": { ...next.playlists.tracks["track-1"], title: "Quiet Inn" },
      },
    },
  } as RootState;
  const changed = createRemoteSnapshot(changedLibraryState);
  const changedUpdate = createRemoteSnapshotUpdate(changed, second.library);
  assert.equal(changedUpdate.library?.tracks[0].title, "Quiet Inn");
});

test("v2 routes expose state and dispatch validated controls", async () => {
  const sent: unknown[][] = [];
  const value = snapshot();
  const manager = {
    getView: () => ({ send: (...args: unknown[]) => sent.push(args) }),
    getRemoteSnapshot: () => value,
  } as unknown as PlayerManager;
  const app = Fastify();
  app.register(v2(manager), { prefix: "/v2" });
  await app.ready();

  const library = await app.inject({ method: "GET", url: "/v2/library" });
  assert.equal(library.statusCode, 200);
  assert.equal(library.json().apiVersion, 2);
  assert.equal(JSON.stringify(library.json()).includes("/private/"), false);

  const state = await app.inject({ method: "GET", url: "/v2/state" });
  assert.equal(state.statusCode, 200);
  assert.equal(state.json().scene.tabId, "tab-1");

  const tags = await app.inject({
    method: "PUT",
    url: "/v2/playlists/playlist-1/tags",
    payload: { tags: ["CREEPY"] },
  });
  assert.equal(tags.statusCode, 200);
  assert.deepEqual(sent.pop(), [
    "PLAYER_REMOTE_PLAYLIST_TAGS",
    "playlist-1",
    ["creepy"],
  ]);

  const scene = await app.inject({
    method: "PUT",
    url: "/v2/scenes/scene-1/tabs/tab-1/activate",
  });
  assert.equal(scene.statusCode, 200);
  assert.deepEqual(sent.pop(), [
    "PLAYER_REMOTE_SCENE_ACTIVATE",
    "scene-1",
    "tab-1",
  ]);

  const group = await app.inject({
    method: "PUT",
    url: "/v2/groups/group-1/play",
  });
  assert.equal(group.statusCode, 200);
  assert.deepEqual(sent.pop(), ["PLAYER_REMOTE_SOUND_GROUP_START", "group-1"]);

  const soundboard = await app.inject({
    method: "PUT",
    url: "/v2/soundboards/board-1/play",
  });
  assert.equal(soundboard.statusCode, 200);
  assert.deepEqual(sent.pop(), ["PLAYER_REMOTE_SOUNDBOARD_PLAY", "board-1"]);

  const stop = await app.inject({ method: "DELETE", url: "/v2/playback" });
  assert.equal(stop.statusCode, 200);
  assert.deepEqual(sent.pop(), ["PLAYER_REMOTE_PLAYLIST_PLAYBACK_STOP"]);

  await app.close();
});

test("v2 routes reject missing IDs, invalid tags, and invalid volumes", async () => {
  const manager = {
    getView: () => ({ send: () => undefined }),
    getRemoteSnapshot: () => snapshot(),
  } as unknown as PlayerManager;
  const app = Fastify();
  app.register(v2(manager), { prefix: "/v2" });
  await app.ready();

  const missing = await app.inject({
    method: "PUT",
    url: "/v2/tracks/missing/play",
  });
  assert.equal(missing.statusCode, 404);

  const tags = await app.inject({
    method: "PUT",
    url: "/v2/playlists/playlist-1/tags",
    payload: { tags: ["peaceful"] },
  });
  assert.equal(tags.statusCode, 400);

  const volume = await app.inject({
    method: "PUT",
    url: "/v2/playback/volume",
    payload: { volume: 2 },
  });
  assert.equal(volume.statusCode, 400);

  await app.close();
});

test("v2 event stream opens as SSE and sends an initial snapshot", async () => {
  const manager = {
    getView: () => ({ send: () => undefined }),
    getRemoteSnapshot: () => snapshot(),
    addRemoteEventClient: (response: ServerResponse) => {
      response.write(
        `event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`,
      );
    },
    removeRemoteEventClient: () => undefined,
  } as unknown as PlayerManager;
  const app = Fastify();
  app.register(v2(manager), { prefix: "/v2" });
  const address = await app.listen({ host: "127.0.0.1", port: 0 });

  try {
    const result = await new Promise<{
      contentType: string;
      body: string;
    }>((resolve, reject) => {
      const request = httpGet(`${address}/v2/events`, (response) => {
        response.setEncoding("utf8");
        response.once("data", (body: string) => {
          resolve({
            contentType: String(response.headers["content-type"]),
            body,
          });
          request.destroy();
        });
      });
      request.on("error", (error) => {
        if (error.message !== "socket hang up") reject(error);
      });
    });
    assert.match(result.contentType, /^text\/event-stream/);
    assert.match(result.body, /^event: snapshot\ndata: /);
  } finally {
    await app.close();
  }
});
