import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import {
  RepeatTimer,
  repeatDelay,
  validRepeatInterval,
} from "../src/player/features/soundboards/repeatInterval";
import reducer, {
  addSoundboard,
  addSound,
  editSound,
} from "../src/player/features/soundboards/soundboardsSlice";

// Exercise the real Sound lifecycle with a deterministic audio backend.
class FakeHowl extends EventEmitter {
  static instances: FakeHowl[] = [];
  _sounds = [{}];
  plays = 0;
  lastSprite?: string;
  position = 0;
  unloaded = false;
  active = true;
  constructor(
    public options: {
      loop: boolean;
      volume: number;
      autoplay?: boolean;
      sprite?: Record<string, [number, number, boolean]>;
    },
  ) {
    super();
    FakeHowl.instances.push(this);
  }
  duration() {
    return 1;
  }
  play(sprite?: string) {
    this.plays++;
    this.lastSprite = sprite;
    if (sprite && this.options.sprite?.[sprite])
      this.position = this.options.sprite[sprite][0] / 1000;
    this.active = true;
    this.emit("play", 1);
  }
  playing() {
    return this.active;
  }
  volume(value?: number) {
    if (value !== undefined) this.options.volume = value;
    return this.options.volume;
  }
  loop(value: boolean) {
    this.options.loop = value;
  }
  fade(...args: [number, number, number]) {
    const [, to] = args;
    this.options.volume = to;
    this.emit("fade");
  }
  stop() {
    this.active = false;
  }
  unload() {
    this.unloaded = true;
    this.active = false;
  }
  seek(to?: number) {
    if (to !== undefined) this.position = to;
    return this.position;
  }
}
// Load and patch Howler before Sound captures its constructor.
/* eslint-disable @typescript-eslint/no-var-requires */
const howler = require("howler");
howler.Howl = FakeHowl;
const { Sound } =
  require("../src/player/features/soundboards/Sound") as typeof import("../src/player/features/soundboards/Sound");
/* eslint-enable @typescript-eslint/no-var-requires */
function createSound() {
  const sound = new Sound({
    src: "hammer.wav",
    volume: 1,
    loop: false,
    fadeIn: 0,
    fadeOut: 0,
    repeatInterval: { minSeconds: 3, maxSeconds: 3 },
  });
  return { sound, audio: FakeHowl.instances[FakeHowl.instances.length - 1] };
}

test("interval bounds reject invalid values and support fixed waits", () => {
  for (const interval of [
    { minSeconds: 0, maxSeconds: 3 },
    { minSeconds: 5, maxSeconds: 3 },
    { minSeconds: NaN, maxSeconds: 3 },
    { minSeconds: 1, maxSeconds: Infinity },
    { minSeconds: 1, maxSeconds: 86401 },
  ]) {
    assert.equal(validRepeatInterval(interval), false);
  }
  assert.equal(
    repeatDelay({ minSeconds: 3, maxSeconds: 8 }, () => 0),
    3000,
  );
  assert.equal(
    repeatDelay({ minSeconds: 3, maxSeconds: 8 }, () => 0.5),
    5500,
  );
  assert.equal(
    repeatDelay({ minSeconds: 3, maxSeconds: 8 }, () => 1),
    8000,
  );
  assert.equal(repeatDelay({ minSeconds: 3, maxSeconds: 3 }), 3000);
});

test("each wait draws a fresh random interval and cancelled callbacks are harmless", () => {
  const callbacks: (() => void)[] = [];
  const draws = [0, 0.5, 1];
  let calls = 0;
  const timer = new RepeatTimer(
    (callback) => {
      callbacks.push(callback);
      return callbacks.length as unknown as ReturnType<typeof setTimeout>;
    },
    () => {},
    () => draws.shift(),
  );
  assert.equal(
    timer.start({ minSeconds: 3, maxSeconds: 8 }, () => calls++),
    3000,
  );
  assert.equal(
    timer.start({ minSeconds: 3, maxSeconds: 8 }, () => calls++),
    5500,
  );
  callbacks[0]();
  assert.equal(calls, 0);
  callbacks[1]();
  assert.equal(calls, 1);
  assert.equal(
    timer.start({ minSeconds: 3, maxSeconds: 8 }, () => calls++),
    8000,
  );
  timer.cancel();
  callbacks[2]();
  assert.equal(calls, 1);
});

test("repeat waits until playback ends, then plays again without overlapping", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  let waiting = 0;
  sound.on("waiting", () => waiting++);
  t.mock.timers.tick(10000);
  assert.equal(audio.plays, 0);
  audio.emit("end");
  assert.equal(waiting, 1);
  t.mock.timers.tick(2999);
  assert.equal(audio.plays, 0);
  t.mock.timers.tick(1);
  assert.equal(audio.plays, 1);
  t.mock.timers.tick(10000);
  assert.equal(audio.plays, 1);
  audio.emit("end");
  t.mock.timers.tick(3000);
  assert.equal(audio.plays, 2);
  void sound.stop(false);
});

test("stop during a wait cancels replay and unloads audio", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  audio.emit("end");
  await sound.stop(true);
  t.mock.timers.tick(10000);
  assert.equal(audio.plays, 0);
  assert.equal(audio.unloaded, true);
  audio.emit("end");
  t.mock.timers.tick(10000);
  assert.equal(audio.plays, 0);
});

test("two sounds repeat independently; stopping one leaves the other active", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = createSound();
  const b = createSound();
  a.audio.emit("end");
  b.audio.emit("end");
  await a.sound.stop(false);
  t.mock.timers.tick(3000);
  assert.equal(a.audio.plays, 0);
  assert.equal(b.audio.plays, 1);
  await b.sound.stop(false);
});

test("editing an interval replaces the pending wait", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  audio.emit("end");
  sound.repeat({ minSeconds: 5, maxSeconds: 5 });
  t.mock.timers.tick(3000);
  assert.equal(audio.plays, 0);
  t.mock.timers.tick(2000);
  assert.equal(audio.plays, 1);
  void sound.stop(false);
});

test("disabling repeat while waiting ends the session", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  let ends = 0;
  sound.on("end", () => ends++);
  audio.emit("end");
  sound.repeat(null);
  assert.equal(ends, 1);
  t.mock.timers.tick(10000);
  assert.equal(audio.plays, 0);
  void sound.stop(false);
});

test("audio errors cancel pending repeats", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  let errors = 0;
  sound.on("error", () => errors++);
  audio.emit("end");
  audio.emit("playerror");
  t.mock.timers.tick(10000);
  assert.equal(errors, 1);
  assert.equal(audio.plays, 0);
  void sound.stop(false);
});

test("continuous looping remains available and can replace a pending random repeat", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { sound, audio } = createSound();
  let ends = 0;
  sound.on("end", () => ends++);
  audio.emit("end");
  sound.loop(true);
  sound.repeat(null);
  assert.equal(audio.plays, 1);
  audio.emit("end");
  t.mock.timers.tick(10000);
  assert.equal(ends, 0);
  assert.equal(audio.plays, 1);
  void sound.stop(false);
});

test("saved repeat configuration survives serialization and excludes continuous loop", () => {
  let state = reducer(
    undefined,
    addSoundboard({ id: "board", title: "Forge", background: "", sounds: [] }),
  );
  state = reducer(
    state,
    addSound({
      soundboardId: "board",
      sound: {
        id: "hammer",
        title: "Hammer",
        url: "hammer.wav",
        loop: true,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
      },
    }),
  );
  state = reducer(
    state,
    editSound({
      id: "hammer",
      repeatInterval: { minSeconds: 3, maxSeconds: 8 },
    }),
  );
  assert.equal(state.sounds.hammer.loop, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(state)).sounds.hammer.repeatInterval,
    { minSeconds: 3, maxSeconds: 8 },
  );
  state = reducer(state, editSound({ id: "hammer", loop: true }));
  assert.equal(state.sounds.hammer.repeatInterval, null);
});

test("enabling random repeat disables the audio backend loop with one fade disabled", () => {
  const sound = new Sound({
    src: "hammer.wav",
    volume: 1,
    loop: true,
    fadeIn: 0,
    fadeOut: 100,
  });
  const audio = FakeHowl.instances[FakeHowl.instances.length - 1];
  sound.repeat({ minSeconds: 3, maxSeconds: 8 });
  assert.equal(audio.options.loop, false);
  void sound.stop(false);
});

test("trimmed continuous sounds loop inside their saved playable range", async () => {
  const sound = new Sound({
    src: "forge.ogg",
    volume: 1,
    loop: true,
    fadeIn: 0,
    fadeOut: 0,
    startSeconds: 0.1,
    endSeconds: 0.8,
  });
  const audio = FakeHowl.instances[FakeHowl.instances.length - 1];
  let duration = 0;
  sound.once("load", (value) => (duration = value));

  assert.equal(audio.options.autoplay, false);
  assert.deepEqual(audio.options.sprite?.trimmed, [100, 700, true]);
  audio.emit("load");
  assert.ok(Math.abs(duration - 0.7) < 1e-9);
  assert.equal(audio.lastSprite, "trimmed");

  sound.seek(0.2);
  assert.ok(Math.abs(audio.position - 0.3) < 1e-9);
  assert.ok(Math.abs(sound.progress() - 0.2) < 1e-9);
  await sound.stop(false);
});
