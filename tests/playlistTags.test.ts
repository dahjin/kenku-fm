import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  getFilteredTracks,
  getTagFacets,
  getPlaybackIndex,
  getPlaylistTags,
  normalizeTags,
} from "../src/player/features/playlists/playlistTags";
import playlistsReducer, {
  addPlaylist,
  addTrack,
  editPlaylist,
  editTrack,
  Playlist,
  Track,
} from "../src/player/features/playlists/playlistsSlice";
import playbackReducer, {
  Queue,
  startQueue,
  shuffle,
  removeTrackFromQueue,
  addTrackToQueueIfNeeded,
} from "../src/player/features/playlists/playlistPlaybackSlice";

const tracks: Record<string, Track> = {
  a: {
    id: "a",
    title: "Cheerful patrons",
    url: "a.mp3",
    tags: ["tavern", "upbeat"],
  },
  b: {
    id: "b",
    title: "Suspicious stranger",
    url: "b.mp3",
    tags: ["tavern", "creep"],
  },
  c: {
    id: "c",
    title: "Empty inn",
    url: "c.mp3",
    tags: ["tavern", "creep", "quiet"],
  },
  d: { id: "d", title: "Legacy track", url: "d.mp3" },
};
const playlist: Playlist = {
  id: "tavern",
  title: "Tavern",
  background: "",
  tracks: Object.keys(tracks),
};
const queue: Queue = {
  playlistId: playlist.id,
  tracks: playlist.tracks,
  current: 0,
  shuffled: [0, 2, 3, 1],
};

test("normalizes pasted hashtags, spacing, commas, case and duplicates", () => {
  assert.deepEqual(
    normalizeTags([" #Creep #tavern ", "CREEP,quiet", "###", ""]),
    ["creep", "tavern", "quiet"],
  );
});

test("legacy libraries show all tracks until a filter is selected", () => {
  assert.deepEqual(getFilteredTracks(playlist, tracks), ["a", "b", "c", "d"]);
  assert.deepEqual(
    getFilteredTracks({ ...playlist, tagFilter: ["#CREEP", "tavern"] }, tracks),
    ["b", "c"],
  );
  assert.deepEqual(
    getFilteredTracks({ ...playlist, tagFilter: ["creep", "upbeat"] }, tracks),
    [],
  );
});

test("suggestions are unique and scoped to the playlist", () => {
  assert.deepEqual(
    getPlaylistTags({ ...playlist, tracks: ["b", "c"] }, tracks),
    ["creep", "quiet", "tavern"],
  );
});

test("tags and filters survive serialization and are local to each playlist entry", () => {
  let state = playlistsReducer(undefined, addPlaylist(playlist));
  state = playlistsReducer(
    state,
    addPlaylist({ ...playlist, id: "other", tracks: [] }),
  );
  state = playlistsReducer(
    state,
    addTrack({
      playlistId: playlist.id,
      track: { ...tracks.b, tags: undefined },
    }),
  );
  state = playlistsReducer(
    state,
    addTrack({
      playlistId: "other",
      track: { ...tracks.b, id: "other-b", tags: undefined },
    }),
  );
  state = playlistsReducer(
    state,
    editTrack({ id: "b", tags: ["#CREEP", "tavern", "creep"] }),
  );
  state = playlistsReducer(
    state,
    editPlaylist({ id: playlist.id, tagFilter: ["#Creep"] }),
  );
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restored.tracks.b.tags, ["creep", "tavern"]);
  assert.equal(restored.tracks["other-b"].tags, undefined);
  assert.deepEqual(restored.playlists.byId.tavern.tagFilter, ["creep"]);
});

test("next and previous skip excluded tracks in sequential and shuffled order", () => {
  assert.equal(getPlaybackIndex(queue, false, "playlist", ["b", "c"], 1), 1);
  assert.equal(getPlaybackIndex(queue, true, "playlist", ["b", "c"], 1), 1); // c in shuffle order
  assert.equal(
    getPlaybackIndex({ ...queue, current: 1 }, true, "playlist", ["b", "c"], 1),
    3,
  );
  assert.equal(
    getPlaybackIndex(
      { ...queue, current: 3 },
      true,
      "playlist",
      ["b", "c"],
      -1,
    ),
    1,
  );
});

test("repeat playlist wraps only among matching tracks", () => {
  assert.equal(
    getPlaybackIndex(
      { ...queue, current: 2 },
      false,
      "playlist",
      ["b", "c"],
      1,
    ),
    1,
  );
  assert.equal(
    getPlaybackIndex(
      { ...queue, current: 1 },
      false,
      "playlist",
      ["b", "c"],
      -1,
    ),
    2,
  );
  assert.equal(
    getPlaybackIndex({ ...queue, current: 1 }, false, "playlist", ["b"], 1),
    1,
  );
});

test("repeat off stops at either end of the matching tracks", () => {
  assert.equal(
    getPlaybackIndex({ ...queue, current: 2 }, false, "off", ["b", "c"], 1),
    undefined,
  );
  assert.equal(
    getPlaybackIndex({ ...queue, current: 1 }, false, "off", ["b", "c"], -1),
    undefined,
  );
});

test("an excluded current track finishes but cannot repeat or restart", () => {
  assert.equal(getPlaybackIndex(queue, false, "track", ["b", "c"], 1), 1);
  assert.equal(
    getPlaybackIndex(queue, false, "track", ["b", "c"], -1, true),
    2,
  );
  assert.equal(
    getPlaybackIndex({ ...queue, current: 1 }, false, "track", ["b", "c"], 1),
    1,
  );
});

test("empty results stop for every repeat and shuffle setting", () => {
  for (const shuffled of [false, true]) {
    for (const repeat of ["off", "track", "playlist"] as const) {
      for (const direction of [1, -1] as const) {
        assert.equal(
          getPlaybackIndex(queue, shuffled, repeat, [], direction),
          undefined,
        );
      }
    }
  }
});

test("clearing filters restores the original order without rebuilding the queue", () => {
  const current = { ...queue, current: 2 };
  assert.equal(getPlaybackIndex(current, false, "playlist", ["b", "c"], 1), 1);
  assert.equal(
    getPlaybackIndex(current, false, "playlist", playlist.tracks, 1),
    3,
  );
});

test("removing an excluded track preserves the current track in both queue modes", () => {
  for (const shuffled of [false, true]) {
    let state = playbackReducer(undefined, shuffle(shuffled));
    state = playbackReducer(
      state,
      startQueue({
        playlistId: playlist.id,
        tracks: playlist.tracks,
        trackId: "b",
      }),
    );
    state = playbackReducer(
      state,
      removeTrackFromQueue({ playlistId: playlist.id, trackId: "a" }),
    );
    const q = state.queue;
    assert.equal(q.tracks[shuffled ? q.shuffled[q.current] : q.current], "b");
    assert.deepEqual([...q.shuffled].sort(), [0, 1, 2]);
  }
});

test("new untagged tracks are not played while a tag filter is active", () => {
  let state = playbackReducer(
    undefined,
    startQueue({
      playlistId: playlist.id,
      tracks: playlist.tracks,
      trackId: "b",
    }),
  );
  state = playbackReducer(
    state,
    addTrackToQueueIfNeeded({ playlistId: playlist.id, trackId: "new" }),
  );
  const index = getPlaybackIndex(state.queue, false, "playlist", ["b", "c"], 1);
  assert.equal(state.queue.tracks[index], "c");
});

test("facets hide incompatible tags and count within the current intersection", () => {
  const tracks = {
    a: { id: "a", title: "A", url: "a", tags: ["creepy", "marsh"] },
    b: { id: "b", title: "B", url: "b", tags: ["creepy", "night"] },
    c: { id: "c", title: "C", url: "c", tags: ["peaceful", "marsh"] },
  };
  const playlist = {
    id: "p",
    title: "P",
    background: "",
    tracks: ["a", "b", "c"],
  };
  assert.deepEqual(getTagFacets(playlist, tracks, ["creepy"]), [
    { tag: "creepy", count: 2, selected: true },
    { tag: "marsh", count: 1, selected: false },
    { tag: "night", count: 1, selected: false },
  ]);
  assert.deepEqual(getTagFacets(playlist, tracks, ["creepy", "marsh"]), [
    { tag: "creepy", count: 1, selected: true },
    { tag: "marsh", count: 1, selected: true },
  ]);
  assert.equal(
    getTagFacets(playlist, tracks, []).find((item) => item.tag === "peaceful")
      .count,
    1,
  );
});

test("zero-match and renamed selections remain visible so filters can be cleared", () => {
  const playlist = { id: "p", title: "P", background: "", tracks: ["gone"] };
  assert.deepEqual(getTagFacets(playlist, {}, ["#Creepy", "peaceful"]), [
    { tag: "creepy", count: 0, selected: true },
    { tag: "peaceful", count: 0, selected: true },
  ]);
});

test("facets count normalized tags once per track", () => {
  const tracks = {
    a: { id: "a", title: "A", url: "a", tags: ["#Creepy", "creepy"] },
  };
  assert.deepEqual(
    getTagFacets(
      { id: "p", title: "P", background: "", tracks: ["a"] },
      tracks,
    ),
    [{ tag: "creepy", count: 1, selected: false }],
  );
});
