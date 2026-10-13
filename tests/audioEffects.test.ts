import assert from "node:assert/strict";
import test from "node:test";
import { Howler } from "howler";
import {
  attachHowlAudioEffects,
  hasAudioEffects,
  normalizeAudioEffects,
  sameAudioEffects,
} from "../src/player/common/audioEffects";

class FakeNode {
  connections: FakeNode[] = [];
  disconnects = 0;
  connect(node: FakeNode) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.connections = [];
    this.disconnects++;
  }
}

class FakeGain extends FakeNode {
  gain = { value: 0 };
}

class FakeFilter extends FakeNode {
  type = "lowpass";
  frequency = { value: 0 };
  Q = { value: 0 };
}

class FakeConvolver extends FakeNode {
  buffer?: unknown;
}

function fakeContext() {
  const filters: FakeFilter[] = [];
  const gains: FakeGain[] = [];
  const convolvers: FakeConvolver[] = [];
  const mediaSources: FakeNode[] = [];
  return {
    context: {
      sampleRate: 10,
      createBuffer: () => ({
        numberOfChannels: 2,
        getChannelData: () => new Float32Array(22),
      }),
      createBiquadFilter: () => {
        const node = new FakeFilter();
        filters.push(node);
        return node;
      },
      createGain: () => {
        const node = new FakeGain();
        gains.push(node);
        return node;
      },
      createConvolver: () => {
        const node = new FakeConvolver();
        convolvers.push(node);
        return node;
      },
      createMediaElementSource: () => {
        const node = new FakeNode();
        mediaSources.push(node);
        return node;
      },
    },
    filters,
    gains,
    convolvers,
    mediaSources,
  };
}

test("normalizes stored filter values and recognizes the direct path", () => {
  assert.deepEqual(normalizeAudioEffects({}), {
    lowPassHz: null,
    reverbMix: 0,
  });
  assert.deepEqual(
    normalizeAudioEffects({ lowPassHz: 20, reverbMix: 2 }),
    { lowPassHz: 100, reverbMix: 1 },
  );
  assert.equal(hasAudioEffects({ lowPassHz: null, reverbMix: 0 }), false);
  assert.equal(hasAudioEffects({ lowPassHz: 1200 }), true);
  assert.equal(
    sameAudioEffects(
      { lowPassHz: undefined, reverbMix: undefined },
      { lowPassHz: null, reverbMix: 0 },
    ),
    true,
  );
});

test("routes Howler Web Audio through low-pass and dry/wet reverb nodes", () => {
  const originalContext = Howler.ctx;
  const originalMaster = Howler.masterGain;
  const fake = fakeContext();
  const master = new FakeGain();
  Howler.ctx = fake.context as unknown as AudioContext;
  Howler.masterGain = master as unknown as GainNode;
  try {
    const input = new FakeGain();
    input.connect(master);
    const howl = {
      _webAudio: true,
      _soundById: (id: number) => (id === 7 ? { _node: input } : undefined),
    };
    const graph = attachHowlAudioEffects(
      howl as never,
      7,
      { lowPassHz: 900, reverbMix: 0.25 },
    );
    assert.ok(graph);
    assert.equal(input.disconnects, 1);
    assert.equal(input.connections[0], fake.filters[0]);
    assert.equal(fake.filters[0].frequency.value, 900);
    assert.equal(fake.filters[0].connections.length, 2);
    assert.equal(fake.gains[0].connections[0], master);
    assert.equal(fake.convolvers[0].connections[0], fake.gains[1]);
    assert.ok(fake.gains[0].gain.value > fake.gains[1].gain.value);

    graph.update({ lowPassHz: null, reverbMix: 0 });
    assert.equal(fake.filters[0].frequency.value, 20000);
    assert.equal(fake.gains[0].gain.value, 1);
    assert.equal(fake.gains[1].gain.value, 0);
    graph.dispose();
    assert.equal(input.disconnects, 2);
  } finally {
    Howler.ctx = originalContext;
    Howler.masterGain = originalMaster;
  }
});

test("keeps HTML5 audio streaming while routing its media element", () => {
  const originalContext = Howler.ctx;
  const originalMaster = Howler.masterGain;
  const originalAutoSuspend = Howler.autoSuspend;
  const fake = fakeContext();
  Howler.ctx = fake.context as unknown as AudioContext;
  Howler.masterGain = new FakeGain() as unknown as GainNode;
  try {
    const element = {};
    const howl = {
      _webAudio: false,
      _soundById: () => ({ _node: element }),
    };
    const graph = attachHowlAudioEffects(
      howl as never,
      1,
      { reverbMix: 0.4 },
    );
    assert.ok(graph);
    assert.equal(Howler.autoSuspend, false);
    assert.equal(fake.mediaSources.length, 1);
    assert.equal(fake.mediaSources[0].connections[0], fake.filters[0]);
    graph.dispose();
    assert.equal(fake.mediaSources[0].connections[0], Howler.masterGain);

    const again = attachHowlAudioEffects(
      howl as never,
      1,
      { lowPassHz: 700 },
    );
    assert.ok(again);
    assert.equal(fake.mediaSources.length, 1);
    assert.equal(fake.mediaSources[0].connections[0], fake.filters[1]);
    again.dispose();
  } finally {
    Howler.ctx = originalContext;
    Howler.masterGain = originalMaster;
    Howler.autoSuspend = originalAutoSuspend;
  }
});
