import { strict as assert } from "node:assert";
import { test } from "node:test";
import { playlistQuickPlay } from "../src/player/features/playlists/playlistQuickPlay";
import type {
  Playlist,
  Track,
} from "../src/player/features/playlists/playlistsSlice";
import type { PlaylistPlaybackState } from "../src/player/features/playlists/playlistPlaybackSlice";
const tracks: Record<string, Track> = {
  a: { id: "a", title: "Day", url: "a", tags: ["marsh", "day"] },
  b: { id: "b", title: "Creepy", url: "b", tags: ["marsh", "creepy"] },
  c: { id: "c", title: "Dark", url: "c", tags: ["creepy"] },
};
const playlist: Playlist = {
  id: "marsh",
  title: "Marsh",
  background: "",
  tracks: ["a", "b", "c"],
  tagFilter: ["marsh", "creepy"],
};
function playback(playing = false, track = tracks.a): PlaylistPlaybackState {
  return {
    playing,
    track,
    shuffle: false,
    repeat: "playlist",
    volume: 1,
    muted: false,
    queue: {
      playlistId: "marsh",
      tracks: ["a", "b", "c"],
      current: 0,
      shuffled: [0, 1, 2],
    },
  };
}

test("Play after changing tags starts a match instead of resuming an excluded paused track", () => {
  assert.deepEqual(playlistQuickPlay(playlist, tracks, playback()), {
    type: "play",
    trackId: "b",
  });
});
test("Play resumes a paused matching track at its current position", () => {
  assert.deepEqual(
    playlistQuickPlay(playlist, tracks, playback(false, tracks.b)),
    { type: "resume" },
  );
});
test("playing playlist button remains a pause control", () => {
  assert.deepEqual(playlistQuickPlay(playlist, tracks, playback(true)), {
    type: "pause",
  });
});
test("filtering the playing playlist switches to a track matching all selected tags", () => {
  assert.deepEqual(playlistQuickPlay(playlist, tracks, playback(true), true), {
    type: "play",
    trackId: "b",
  });
});
test("filtering preserves a currently matching track", () => {
  assert.deepEqual(
    playlistQuickPlay(playlist, tracks, playback(true, tracks.b), true),
    { type: "none" },
  );
});
test("choosing tags on an idle or different playlist never starts audio", () => {
  assert.deepEqual(playlistQuickPlay(playlist, tracks, playback(), true), {
    type: "none",
  });
  const other = playback(true);
  other.queue.playlistId = "other";
  assert.deepEqual(playlistQuickPlay(playlist, tracks, other, true), {
    type: "none",
  });
});
test("no matches pauses this playlist but never pauses another playlist", () => {
  const empty = { ...playlist, tagFilter: ["missing"] };
  assert.deepEqual(playlistQuickPlay(empty, tracks, playback(true), true), {
    type: "pause",
  });
  const other = playback(true);
  other.queue.playlistId = "other";
  assert.deepEqual(playlistQuickPlay(empty, tracks, other, true), {
    type: "none",
  });
  assert.deepEqual(playlistQuickPlay(empty, tracks, playback()), {
    type: "none",
  });
});
test("shuffle chooses only from matching, nondeleted tracks", () => {
  const state = playback();
  state.shuffle = true;
  assert.deepEqual(
    playlistQuickPlay(
      {
        ...playlist,
        tagFilter: ["creepy"],
        tracks: ["deleted", ...playlist.tracks],
      },
      tracks,
      state,
      false,
      () => 0.99,
    ),
    { type: "play", trackId: "c" },
  );
});

test("Home smart shuffle uses recent history and tag priorities for its first pick", () => {
  const smart = {
    ...playlist,
    tagFilter: [],
    smartShuffle: true,
    avoidRecent: 1,
    tagPriorities: { creepy: 4 },
  };
  const state = playback();
  state.shuffle = true;
  state.queue.playlistId = "other";
  state.recentByPlaylist = { marsh: ["c"] };
  assert.deepEqual(
    playlistQuickPlay(smart, tracks, state, false, () => 0.5),
    { type: "play", trackId: "b" },
  );
});
