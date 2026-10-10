import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  chooseSmartTrack,
  trackWeight,
  smartShuffleEnabled,
  SmartShufflePlanner,
} from "../src/player/features/playlists/smartShuffle";
import type {
  Playlist,
  Track,
} from "../src/player/features/playlists/playlistsSlice";
import playbackReducer, {
  playTrack,
  startQueue,
} from "../src/player/features/playlists/playlistPlaybackSlice";
const playlist: Playlist = {
  id: "p",
  title: "P",
  background: "",
  tracks: ["a", "b", "c"],
  smartShuffle: true,
  avoidRecent: 2,
  tagPriorities: { creepy: 4 },
};
const tracks: Record<string, Track> = {
  a: { id: "a", title: "A", url: "a", tags: ["creepy"] },
  b: { id: "b", title: "B", url: "b", tags: ["peaceful"] },
  c: {
    id: "c",
    title: "C",
    url: "c",
    tags: ["creepy", "night"],
    frequency: 0.25,
  },
};
test("smart settings only affect opted-in repeating shuffle", () => {
  assert.equal(smartShuffleEnabled(playlist, true, "playlist"), true);
  for (const repeat of ["off", "track"])
    assert.equal(smartShuffleEnabled(playlist, true, repeat), false);
  assert.equal(smartShuffleEnabled(playlist, false, "playlist"), false);
  assert.equal(
    smartShuffleEnabled({ ...playlist, smartShuffle: false }, true, "playlist"),
    false,
  );
});
test("recent exclusion takes precedence over tag priority", () => {
  assert.equal(
    chooseSmartTrack(playlist.tracks, tracks, playlist, ["c", "a"], () => 0),
    "b",
  );
});
test("a small filtered pool relaxes oldest exclusions rather than going silent", () => {
  assert.equal(
    chooseSmartTrack(["a", "b"], tracks, playlist, ["a", "b"], () => 0),
    "a",
  );
  assert.equal(
    chooseSmartTrack(["b"], tracks, playlist, ["b", "b"], () => 0),
    "b",
  );
  assert.equal(chooseSmartTrack([], tracks, playlist), undefined);
});
test("zero exclusion permits a recent track and never introduces a filtered-out track", () => {
  assert.equal(
    chooseSmartTrack(
      ["a"],
      tracks,
      { ...playlist, avoidRecent: 0 },
      ["a"],
      () => 0,
    ),
    "a",
  );
  assert.equal(
    chooseSmartTrack(["missing", "b"], tracks, playlist, [], () => 0),
    "b",
  );
});
test("frequency multiplies the strongest tag priority without stacking tags", () => {
  assert.equal(trackWeight(tracks.a, playlist), 4);
  assert.equal(
    trackWeight(tracks.c, {
      ...playlist,
      tagPriorities: { creepy: 4, night: 2 },
    }),
    1,
  );
  assert.equal(trackWeight({ ...tracks.b, frequency: NaN }, playlist), 1);
});
test("weighted selection gives preferred tracks proportionally more probability", () => {
  const counts: Record<string, number> = { a: 0, b: 0 };
  for (let i = 0; i < 100; i++)
    counts[
      chooseSmartTrack(["a", "b"], tracks, playlist, [], () => (i + 0.5) / 100)
    ]++;
  assert.deepEqual(counts, { a: 80, b: 20 });
});
test("repeated preload checks keep the same draw until inputs change", () => {
  let draws = 0;
  const planner = new SmartShufflePlanner(() => {
    draws++;
    return 0;
  });
  planner.commit("p", "a", true);
  for (let i = 0; i < 20; i++)
    assert.equal(
      planner.choose(1, playlist, tracks, playlist.tracks, ["a"]),
      "b",
    );
  assert.equal(draws, 1);
  assert.equal(planner.choose(1, playlist, tracks, ["c"], ["a"]), "c");
  assert.equal(draws, 2);
});
test("Previous and Next follow actual listening history, including repeated Previous", () => {
  const planner = new SmartShufflePlanner(() => 0);
  for (const id of ["a", "c", "b"]) planner.commit("p", id, true);
  assert.equal(planner.choose(-1, playlist, tracks, playlist.tracks, []), "c");
  planner.commit("p", "c");
  assert.equal(planner.choose(-1, playlist, tracks, playlist.tracks, []), "a");
  planner.commit("p", "a");
  assert.equal(planner.choose(1, playlist, tracks, playlist.tracks, []), "c");
  planner.commit("p", "c");
  assert.equal(planner.choose(1, playlist, tracks, playlist.tracks, []), "b");
});
test("history navigation skips deleted and filtered-out tracks", () => {
  const planner = new SmartShufflePlanner(() => 0);
  for (const id of ["a", "c", "b"]) planner.commit("p", id, true);
  assert.equal(planner.choose(-1, playlist, tracks, ["a", "b"], []), "a");
});
test("recorded recent history is bounded, per playlist, and only updated on playback start", () => {
  let state = playbackReducer(undefined, { type: "init" });
  state = playbackReducer(
    state,
    startQueue({ playlistId: "p", tracks: playlist.tracks, trackId: "a" }),
  );
  assert.equal(state.recentByPlaylist, undefined);
  for (let i = 0; i < 120; i++)
    state = playbackReducer(
      state,
      playTrack({ track: tracks.a, duration: 100 }),
    );
  assert.equal(state.recentByPlaylist.p.length, 100);
  state = playbackReducer(
    state,
    startQueue({ playlistId: "other", tracks: ["b"], trackId: "b" }),
  );
  state = playbackReducer(state, playTrack({ track: tracks.b, duration: 100 }));
  assert.deepEqual(state.recentByPlaylist.other, ["b"]);
  assert.equal(state.recentByPlaylist.p.length, 100);
});
