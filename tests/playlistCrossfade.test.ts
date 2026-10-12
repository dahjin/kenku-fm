import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { Howl } from "howler";
import {
  PlaylistAudio,
  crossfadeDuration,
} from "../src/player/features/playlists/PlaylistAudio";
import { Track } from "../src/player/features/playlists/playlistsSlice";

class Audio extends EventEmitter {
  position = 0;
  level = 0;
  active = false;
  unloaded = false;
  muted = false;
  plays = 0;
  soundId = 1;
  resumedWithId = false;
  constructor(public length = 100) {
    super();
  }
  off(event?: string, listener?: (...args: unknown[]) => void): this {
    if (event && listener) super.off(event, listener);
    else this.removeAllListeners();
    return this;
  }
  unload() {
    this.unloaded = true;
    this.active = false;
  }
  volume(value?: number) {
    if (arguments.length === 1 && value === this.soundId) return this.level;
    if (value !== undefined) this.level = value;
    return this.level;
  }
  mute(value: boolean) {
    this.muted = value;
  }
  seek(value?: number) {
    if (arguments.length === 1 && value === this.soundId) return this.position;
    if (value !== undefined) this.position = value;
    return this.position;
  }
  duration() {
    return this.length;
  }
  play(id?: number) {
    if (this.plays > 0 && id === undefined) this.position = 0;
    if (id === this.soundId) this.resumedWithId = true;
    this.active = true;
    this.plays++;
    return this.soundId;
  }
  playing() {
    return this.active;
  }
  pause() {
    this.active = false;
  }
  stop() {
    this.active = false;
    this.position = 0;
  }
  load() {
    this.emit("load");
  }
  end() {
    this.active = false;
    this.position = this.length;
    this.emit("end");
  }
}
const a: Track = { id: "a", url: "a.mp3", title: "A" };
const b: Track = { id: "b", url: "b.mp3", title: "B" };
const c: Track = { id: "c", url: "c.mp3", title: "C" };
function setup(seconds = 3, length = 100) {
  const audio: Audio[] = [];
  const started: string[] = [];
  const errors: string[] = [];
  let next: Track | undefined = b;
  let stops = 0;
  const player = new PlaylistAudio(
    {
      next: () => next,
      crossfade: () => seconds,
      onStart: (track) => started.push(track.id),
      onProgress: () => {},
      onStop: () => stops++,
      onError: (error) => errors.push(error),
    },
    () => {
      const value = new Audio(length);
      audio.push(value);
      return value as unknown as Howl;
    },
  );
  player.play(a);
  audio[0].load();
  return {
    player,
    audio,
    started,
    errors,
    next: (track?: Track) => {
      next = track;
    },
    stops: () => stops,
  };
}

test("crossfade length is bounded by half of each track and disabled for invalid durations", () => {
  assert.equal(crossfadeDuration(3, 100, 80), 3);
  assert.equal(crossfadeDuration(10, 4, 100), 2);
  assert.equal(crossfadeDuration(10, 100, 2), 1);
  assert.equal(crossfadeDuration(0, 100, 100), 0);
  assert.equal(crossfadeDuration(3, Infinity, 100), 0);
});

test("preloads silently and overlaps only during the requested final seconds", () => {
  const f = setup();
  f.player.tick();
  assert.equal(f.audio.length, 2);
  f.audio[1].load();
  assert.equal(f.audio[1].active, false);
  f.audio[0].position = 96;
  f.player.tick();
  assert.deepEqual(f.started, ["a"]);
  f.audio[0].position = 97;
  f.player.tick();
  assert.deepEqual(f.started, ["a", "b"]);
  assert.equal(f.audio[0].active, true);
  assert.equal(f.audio[1].active, true);
  f.audio[1].position = 1.5;
  f.player.tick();
  assert.equal(f.audio[0].level, 0.5);
  assert.equal(f.audio[1].level, 0.5);
  f.audio[1].position = 3;
  f.player.tick();
  assert.equal(f.audio[0].unloaded, true);
  assert.equal(f.audio[1].level, 1);
  f.player.dispose();
});

test("zero crossfade plays the next track only after the current track ends", () => {
  const f = setup(0);
  f.audio[0].position = 99;
  f.player.tick();
  assert.equal(f.audio.length, 1);
  f.audio[0].end();
  f.audio[1].load();
  assert.equal(f.audio[0].unloaded, true);
  assert.equal(f.audio[1].level, 1);
  f.player.dispose();
});

test("filter changes discard a preloaded track before it can be played", () => {
  const f = setup();
  f.player.tick();
  f.audio[1].load();
  f.next(c);
  f.player.tick();
  assert.equal(f.audio[1].unloaded, true);
  f.audio[2].load();
  f.audio[0].position = 97;
  f.player.tick();
  assert.deepEqual(f.started, ["a", "c"]);
  f.player.dispose();
});

test("audio effect changes replace a preloaded copy of the same track", () => {
  const f = setup();
  f.player.tick();
  f.audio[1].load();
  f.next({ ...b, lowPassHz: 1200, reverbMix: 0.25 });
  f.player.tick();
  assert.equal(f.audio[1].unloaded, true);
  assert.equal(f.audio.length, 3);
  f.player.dispose();
});

test("filter changes during loading at track end cannot play an excluded track", () => {
  const f = setup();
  f.audio[0].end();
  f.next(c);
  f.audio[1].load();
  assert.equal(f.audio[1].unloaded, true);
  f.audio[2].load();
  assert.deepEqual(f.started, ["a", "c"]);
  f.player.dispose();
});

test("empty selection or repeat-off at the last track stops without another track", () => {
  const f = setup();
  f.next();
  f.audio[0].position = 99;
  f.player.tick();
  assert.equal(f.audio.length, 1);
  f.audio[0].end();
  assert.equal(f.stops(), 1);
  f.player.dispose();
});

test("pause, resume, mute and volume control both sides of the fade", () => {
  const f = setup();
  f.player.tick();
  f.audio[1].load();
  f.audio[0].position = 97;
  f.player.tick();
  f.audio[1].position = 1.5;
  f.player.tick();
  f.player.pauseResume(false);
  assert.equal(f.audio[0].active, false);
  assert.equal(f.audio[1].active, false);
  f.player.mute(true);
  assert.equal(f.audio[0].muted, true);
  assert.equal(f.audio[1].muted, true);
  f.player.volume(0.4);
  assert.equal(f.audio[0].level, 0.2);
  assert.equal(f.audio[1].level, 0.2);
  f.player.pauseResume(true);
  assert.equal(f.audio[0].active, true);
  assert.equal(f.audio[1].active, true);
  assert.equal(f.audio[0].resumedWithId, true);
  assert.equal(f.audio[1].resumedWithId, true);
  f.player.dispose();
});

test("pause and resume preserve the current position and progress source", () => {
  const progress: number[] = [];
  const audio: Audio[] = [];
  const player = new PlaylistAudio(
    {
      next: () => undefined,
      crossfade: () => 0,
      onStart: () => {},
      onProgress: (seconds) => progress.push(seconds),
      onStop: () => {},
      onError: () => {},
    },
    () => {
      const value = new Audio();
      audio.push(value);
      return value as unknown as Howl;
    },
  );
  player.play(a);
  audio[0].load();
  audio[0].position = 37.4;
  player.tick();
  player.pauseResume(false);
  player.pauseResume(true);
  assert.equal(audio[0].position, 37.4);
  assert.equal(audio[0].plays, 2);
  assert.equal(audio[0].resumedWithId, true);
  audio[0].position = 38.1;
  player.tick();
  assert.equal(progress[progress.length - 1], 38.1);
  player.dispose();
});

test("pause while a requested track loads does not autoplay it afterward", () => {
  const f = setup();
  f.player.play(b);
  f.player.pauseResume(false);
  f.audio[1].load();
  assert.equal(f.audio[1].active, false);
  f.player.pauseResume(true);
  assert.equal(f.audio[1].active, true);
  f.player.dispose();
});

test("short incoming tracks shorten the overlap", () => {
  const f = setup(10);
  f.player.tick();
  f.audio[1].length = 2;
  f.audio[1].load();
  f.audio[0].position = 98;
  f.player.tick();
  assert.deepEqual(f.started, ["a"]);
  f.audio[0].position = 99;
  f.player.tick();
  assert.deepEqual(f.started, ["a", "b"]);
  f.audio[1].position = 1;
  f.player.tick();
  assert.equal(f.audio[0].unloaded, true);
  f.player.dispose();
});

test("seek ends the old side of an overlap and restores full gain", () => {
  const f = setup();
  f.player.tick();
  f.audio[1].load();
  f.audio[0].position = 97;
  f.player.tick();
  f.player.seek(20);
  assert.equal(f.audio[0].unloaded, true);
  assert.equal(f.audio[1].position, 20);
  assert.equal(f.audio[1].level, 1);
  f.player.dispose();
});

test("stop cancels preloads and late load events cannot restart playback", () => {
  const f = setup();
  f.player.play(b);
  f.player.stop();
  f.audio[1].load();
  assert.deepEqual(f.started, ["a"]);
  assert.equal(f.audio[1].unloaded, true);
  assert.equal(f.audio[0].active, false);
  f.player.dispose();
});

test("rapid manual selections discard obsolete load callbacks", () => {
  const f = setup();
  f.player.play(b);
  f.player.play(c);
  f.audio[1].load();
  f.audio[2].load();
  assert.deepEqual(f.started, ["a", "c"]);
  f.player.dispose();
});

test("failed preloads leave the current track running and do not retry every tick", () => {
  const f = setup();
  f.player.tick();
  f.audio[1].emit("loaderror");
  f.player.tick();
  f.player.tick();
  assert.equal(f.audio[0].active, true);
  assert.equal(f.audio.length, 2);
  assert.equal(f.errors.length, 1);
  f.player.dispose();
});

test("repeat-track can overlap a fresh instance of the same track", () => {
  const f = setup();
  f.next(a);
  f.player.tick();
  f.audio[1].load();
  f.audio[0].position = 97;
  f.player.tick();
  assert.deepEqual(f.started, ["a", "a"]);
  assert.equal(f.audio[0].active, true);
  assert.equal(f.audio[1].active, true);
  f.player.dispose();
});

test("starts at the marker and seeks only inside the playable range", () => {
  const f = setup();
  f.player.play({ ...b, startSeconds: 12.5, endSeconds: 80 });
  f.audio[1].load();
  assert.equal(f.audio[1].position, 12.5);
  f.player.seek(0);
  assert.equal(f.audio[1].position, 12.5);
  f.player.seek(99);
  assert.equal(f.audio[1].position, 80);
  f.player.dispose();
});

test("end marker advances without waiting for the file end, including zero overlap", () => {
  const f = setup(0);
  f.player.play({ ...b, startSeconds: 10, endSeconds: 20 });
  f.audio[1].load();
  f.next(c);
  f.audio[1].position = 20;
  f.player.tick();
  assert.equal(f.audio[1].active, false);
  f.audio[2].load();
  assert.deepEqual(f.started, ["a", "b", "c"]);
  f.player.dispose();
});

test("marker end stops when there is no next track", () => {
  const f = setup();
  f.player.play({ ...b, endSeconds: 20 });
  f.audio[1].load();
  f.next();
  f.audio[1].position = 20;
  f.player.tick();
  assert.equal(f.stops(), 1);
  assert.equal(f.audio[1].active, false);
  f.player.dispose();
});

test("crossfade uses trimmed lengths and elapsed time from the incoming start marker", () => {
  const f = setup(10);
  f.player.play({ ...b, startSeconds: 20, endSeconds: 28 });
  f.audio[1].load();
  f.player.seek(20); // Finish the manual transition.
  f.next({ ...c, startSeconds: 50, endSeconds: 60 });
  f.player.tick();
  f.audio[2].load();
  f.audio[1].position = 24;
  f.player.tick();
  assert.equal(f.audio[2].position, 50);
  f.audio[2].position = 52;
  f.player.tick();
  assert.equal(f.audio[1].level, 0.5);
  assert.equal(f.audio[2].level, 0.5);
  f.player.dispose();
});

test("track override zero disables the playlist fade", () => {
  const f = setup(5);
  f.player.play({ ...b, crossfadeSeconds: 0, endSeconds: 30 });
  f.audio[1].load();
  f.player.seek(20);
  f.next(c);
  f.player.tick();
  assert.equal(f.audio.length, 2);
  f.audio[1].position = 30;
  f.player.tick();
  f.audio[2].load();
  assert.equal(f.audio[2].level, 1);
  f.player.dispose();
});

test("invalid markers fall back after replacing a file with a shorter track", () => {
  const f = setup();
  f.player.play({ ...b, startSeconds: 200, endSeconds: 300 });
  f.audio[1].load();
  assert.equal(f.audio[1].position, 0);
  f.player.seek(300);
  assert.equal(f.audio[1].position, 100);
  f.player.dispose();
});

test("scene transition overrides the outgoing fade and can fade music to silence", () => {
  const f = setup(0);
  f.player.play(b, false, 2);
  f.audio[1].load();
  assert.equal(f.audio[0].active, true);
  f.audio[1].position = 1;
  f.player.tick();
  assert.equal(f.audio[1].level, 0.5);
  f.player.fadeOut(2);
  f.audio[1].position = 2;
  f.player.tick();
  assert.equal(f.audio[1].level, 0.25);
  f.audio[1].position = 3;
  f.player.tick();
  assert.equal(f.stops(), 1);
  f.player.dispose();
});

test("activating another track cancels a pending fade to silence", () => {
  const f = setup();
  f.player.fadeOut(2);
  f.player.play(c, false, 1);
  f.audio[1].load();
  f.audio[1].position = 3;
  f.player.tick();
  assert.equal(f.stops(), 0);
  assert.equal(f.audio[1].active, true);
  f.player.dispose();
});

test("returning to a scene whose current track still matches cancels another tab's loading track", () => {
  const f = setup();
  f.player.play(b);
  f.player.retainCurrent();
  f.audio[1].load();
  assert.deepEqual(f.started, ["a"]);
  assert.equal(f.audio[1].unloaded, true);
  assert.equal(f.audio[0].active, true);
  f.player.dispose();
});

test("repeating a trimmed track starts a fresh instance at its start marker", () => {
  const f = setup(0);
  const trimmed = { ...b, startSeconds: 10, endSeconds: 20 };
  f.player.play(trimmed);
  f.audio[1].load();
  f.next(trimmed);
  f.audio[1].position = 20;
  f.player.tick();
  f.audio[2].load();
  assert.equal(f.audio[2].position, 10);
  assert.deepEqual(f.started, ["a", "b", "b"]);
  f.player.dispose();
});

test("loading a manual selection does not consume a smart next-track choice", () => {
  let choices = 0;
  const audio: Audio[] = [];
  const player = new PlaylistAudio(
    {
      next: () => {
        choices++;
        return b;
      },
      crossfade: () => 0,
      onStart: () => {},
      onProgress: () => {},
      onStop: () => {},
      onError: () => {},
    },
    () => {
      const instance = new Audio();
      audio.push(instance);
      return instance as unknown as Howl;
    },
  );
  player.play(a);
  audio[0].load();
  player.play(b);
  audio[1].load();
  assert.equal(choices, 0);
  player.dispose();
});
