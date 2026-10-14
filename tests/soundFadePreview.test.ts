import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Howl, HowlOptions } from "howler";
import {
  incomingPreviewDuration,
  loopTransitionPreviewWindow,
  SoundFadePreview,
} from "../src/player/features/soundboards/SoundFadePreview";

class FakeHowl {
  seekCalls: [number, number][] = [];
  fadeCalls: [number, number, number, number][] = [];
  unloaded = false;

  constructor(
    public options: HowlOptions,
    private currentVolume = options.volume ?? 1,
  ) {}

  duration() {
    return 60;
  }

  seek(to: number, id: number) {
    this.seekCalls.push([to, id]);
    return this as unknown as Howl;
  }

  volume(valueOrId?: number, id?: number) {
    if (id !== undefined && valueOrId !== undefined) {
      this.currentVolume = valueOrId;
      return this as unknown as Howl;
    }
    return this.currentVolume;
  }

  fade(from: number, to: number, milliseconds: number, id: number) {
    this.fadeCalls.push([from, to, milliseconds, id]);
    this.currentVolume = to;
    return this as unknown as Howl;
  }

  unload() {
    this.unloaded = true;
  }

  begin(id = 7) {
    this.options.onplay?.(id);
  }
}

test("loop preview starts shortly before the outgoing fade", () => {
  assert.deepEqual(loopTransitionPreviewWindow(60, 3000), {
    start: 55.5,
    transitionDelayMilliseconds: 1500,
  });
  assert.deepEqual(loopTransitionPreviewWindow(4, 10000), {
    start: 0,
    transitionDelayMilliseconds: 0,
  });
});

test("incoming preview includes time after its fade finishes", () => {
  assert.equal(incomingPreviewDuration(3000), 4500);
  assert.equal(incomingPreviewDuration(100), 2500);
});

test("preview plays the outgoing end and incoming beginning together", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const audio: FakeHowl[] = [];
  let playing = 0;
  let finished = 0;
  const preview = new SoundFadePreview(
    {
      src: "minute-long.ogg",
      volume: 0.75,
      fadeInMilliseconds: 2000,
      fadeOutMilliseconds: 3000,
      onPlaying: () => playing++,
      onFinish: () => finished++,
      onError: () => assert.fail("preview should not fail"),
    },
    (options) => {
      const instance = new FakeHowl(options);
      audio.push(instance);
      return instance as unknown as Howl;
    },
  );

  preview.start();
  assert.equal(audio.length, 1);
  assert.equal(audio[0].options.autoplay, true);
  audio[0].begin();
  assert.equal(playing, 1);
  assert.deepEqual(audio[0].seekCalls, [[55.5, 7]]);

  t.mock.timers.tick(1499);
  assert.equal(audio.length, 1);
  t.mock.timers.tick(1);
  assert.deepEqual(audio[0].fadeCalls, [[0.75, 0, 3000, 7]]);
  assert.equal(audio.length, 2);
  assert.equal(audio[1].options.volume, 0);

  audio[1].begin(8);
  assert.deepEqual(audio[1].fadeCalls, [[0, 0.75, 2000, 8]]);
  t.mock.timers.tick(3499);
  assert.equal(finished, 0);
  t.mock.timers.tick(1);
  assert.equal(finished, 1);
  assert.equal(audio.every((item) => item.unloaded), true);
});
