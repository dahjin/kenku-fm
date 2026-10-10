import { strict as assert } from "node:assert";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { SoundGroupPlayer } from "../src/player/features/soundboards/SoundGroupPlayer";
import { Sound } from "../src/player/features/soundboards/Sound";
import {
  SoundGroup,
  Sound as SoundData,
} from "../src/player/features/soundboards/soundboardsSlice";

class FakeSound extends EventEmitter {
  stopped = false;
  level = 1;
  async stop() {
    this.stopped = true;
  }
  volume(value: number) {
    this.level = value;
  }
}
function setup(draws = [0, 0.99, 0]) {
  let group: SoundGroup | undefined = {
    id: "forge",
    title: "Blacksmith",
    soundIds: ["a", "b"],
    interval: { minSeconds: 3, maxSeconds: 3 },
  };
  const sounds: Record<string, SoundData> = Object.fromEntries(
    ["a", "b"].map((id) => [
      id,
      {
        id,
        title: id,
        url: id + ".wav",
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        loop: false,
      },
    ]),
  );
  const instances: FakeSound[] = [];
  const selected: string[] = [];
  const states: boolean[] = [];
  const errors: string[] = [];
  let finishes = 0;
  const player = new SoundGroupPlayer(
    {
      group: () => group,
      sound: (id) => sounds[id],
      status: (waiting) => states.push(waiting),
      finish: () => finishes++,
      error: (message) => errors.push(message),
    },
    (sound) => {
      selected.push(sound.id);
      const instance = new FakeSound();
      instances.push(instance);
      return instance as unknown as Sound;
    },
    () => draws.shift() ?? 0,
  );
  return {
    player,
    instances,
    selected,
    states,
    sounds,
    errors,
    group: () => group,
    setGroup: (value?: SoundGroup) => {
      group = value;
    },
    finishes: () => finishes,
  };
}

test("group chooses one sound immediately, then waits after it ends before choosing another", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup();
  f.player.start();
  assert.deepEqual(f.selected, ["a"]);
  t.mock.timers.tick(10000);
  assert.equal(f.instances.length, 1);
  f.instances[0].emit("end");
  assert.equal(f.instances[0].stopped, true);
  assert.deepEqual(f.states, [false, true]);
  t.mock.timers.tick(2999);
  assert.equal(f.instances.length, 1);
  t.mock.timers.tick(1);
  assert.deepEqual(f.selected, ["a", "b"]);
  assert.equal(f.instances[0].stopped, true);
  f.player.stop();
});

test("stop cancels a group's pending wait and later events", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup();
  f.player.start();
  f.instances[0].emit("end");
  f.player.stop();
  t.mock.timers.tick(10000);
  assert.equal(f.instances.length, 1);
  f.instances[0].emit("end");
  t.mock.timers.tick(10000);
  assert.equal(f.instances.length, 1);
});

test("stopping an active group unloads its current sound", () => {
  const f = setup();
  f.player.start();
  f.player.stop();
  assert.equal(f.instances[0].stopped, true);
});

test("different groups have independent timers", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = setup(),
    b = setup();
  a.player.start();
  b.player.start();
  a.instances[0].emit("end");
  b.instances[0].emit("end");
  a.player.stop();
  t.mock.timers.tick(3000);
  assert.equal(a.instances.length, 1);
  assert.equal(b.instances.length, 2);
  b.player.stop();
});

test("removed members are never selected and deleting the group cancels it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup();
  f.player.start();
  delete f.sounds.a;
  f.player.update();
  assert.equal(f.instances[0].stopped, true);
  t.mock.timers.tick(3000);
  assert.deepEqual(f.selected, ["a", "b"]);
  f.setGroup();
  f.player.update();
  assert.equal(f.instances[1].stopped, true);
  assert.equal(f.finishes(), 1);
});

test("empty groups stop cleanly", () => {
  const f = setup();
  f.group().soundIds = [];
  f.player.start();
  assert.equal(f.instances.length, 0);
  assert.equal(f.finishes(), 1);
});

test("editing the delay replaces a pending wait", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup();
  f.player.start();
  f.instances[0].emit("end");
  f.group().interval = { minSeconds: 5, maxSeconds: 5 };
  f.player.update();
  t.mock.timers.tick(3000);
  assert.equal(f.instances.length, 1);
  t.mock.timers.tick(2000);
  assert.equal(f.instances.length, 2);
  f.player.stop();
});

test("group audio follows the current member's volume", () => {
  const f = setup();
  f.player.start();
  f.sounds.a.volume = 0.3;
  f.player.update();
  assert.equal(f.instances[0].level, 0.3);
  f.player.stop();
});

test("audio errors stop the group rather than scheduling endless retries", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = setup();
  f.player.start();
  f.instances[0].emit("error");
  assert.equal(f.instances[0].stopped, true);
  assert.equal(f.finishes(), 1);
  assert.equal(f.errors.length, 1);
  t.mock.timers.tick(10000);
  assert.equal(f.instances.length, 1);
});
