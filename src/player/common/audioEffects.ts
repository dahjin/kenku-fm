import { Howl, Howler } from "howler";

export const MIN_LOW_PASS_HZ = 100;
export const MAX_LOW_PASS_HZ = 20000;
export const DEFAULT_LOW_PASS_HZ = 1200;

export interface AudioEffects {
  lowPassHz?: number | null;
  reverbMix?: number;
}

export interface AudioEffectGraph {
  update: (effects: AudioEffects) => void;
  dispose: () => void;
}

type HowlerSound = {
  _node?: AudioNode | HTMLMediaElement;
};

type HowlInternals = {
  _webAudio?: boolean;
  _soundById?: (id: number) => HowlerSound | undefined;
};

const impulseResponses = new WeakMap<BaseAudioContext, AudioBuffer>();
const mediaElementSources = new WeakMap<
  HTMLMediaElement,
  MediaElementAudioSourceNode
>();

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeAudioEffects(effects: AudioEffects): Required<AudioEffects> {
  const cutoff = Number(effects.lowPassHz);
  const reverb = Number(effects.reverbMix);
  return {
    lowPassHz:
      effects.lowPassHz == null || !Number.isFinite(cutoff)
        ? null
        : clamp(cutoff, MIN_LOW_PASS_HZ, MAX_LOW_PASS_HZ),
    reverbMix: Number.isFinite(reverb) ? clamp(reverb, 0, 1) : 0,
  };
}

export function hasAudioEffects(effects: AudioEffects) {
  const normalized = normalizeAudioEffects(effects);
  return normalized.lowPassHz !== null || normalized.reverbMix > 0;
}

export function sameAudioEffects(left: AudioEffects, right: AudioEffects) {
  const a = normalizeAudioEffects(left);
  const b = normalizeAudioEffects(right);
  return a.lowPassHz === b.lowPassHz && a.reverbMix === b.reverbMix;
}

function impulseResponse(context: BaseAudioContext) {
  const cached = impulseResponses.get(context);
  if (cached) return cached;
  const seconds = 2.2;
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      const decay = Math.pow(1 - index / length, 2.5);
      samples[index] = (Math.random() * 2 - 1) * decay;
    }
  }
  impulseResponses.set(context, buffer);
  return buffer;
}

/**
 * Inserts Web Audio filters after a single Howler sound instance. HTML5 audio
 * remains streamed; only the element's output is routed into the Web Audio
 * graph. Returning undefined leaves Howler's original audio path untouched.
 */
export function attachHowlAudioEffects(
  howl: Howl,
  soundId: number,
  effects: AudioEffects,
): AudioEffectGraph | undefined {
  const normalized = normalizeAudioEffects(effects);
  if (!hasAudioEffects(normalized)) return undefined;

  const context = Howler.ctx;
  const output = Howler.masterGain;
  const internals = howl as unknown as HowlInternals;
  const sound = internals._soundById?.(soundId);
  if (!context || !output || !sound?._node) return undefined;

  let input: AudioNode | undefined;
  let reroutedHtmlElement = false;
  const nodes: AudioNode[] = [];
  try {
    if (internals._webAudio) {
      input = sound._node as AudioNode;
    } else {
      if (typeof context.createMediaElementSource !== "function")
        return undefined;
      const element = sound._node as HTMLMediaElement;
      input = mediaElementSources.get(element);
      if (!input) {
        input = context.createMediaElementSource(element);
        mediaElementSources.set(element, input as MediaElementAudioSourceNode);
      }
      // A captured HTMLAudioElement depends on this context even after Howler
      // recycles it as ordinary HTML5 audio, so automatic suspension would
      // make a later pooled playback silent.
      Howler.autoSuspend = false;
      if (context.state === "suspended") void context.resume().catch(() => {});
      reroutedHtmlElement = true;
    }

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    nodes.push(filter);

    const dry = context.createGain();
    const wet = context.createGain();
    const convolver = context.createConvolver();
    convolver.buffer = impulseResponse(context);
    nodes.push(dry, wet, convolver);

    input.disconnect();
    input.connect(filter);
    filter.connect(dry);
    dry.connect(output);
    filter.connect(convolver);
    convolver.connect(wet);
    wet.connect(output);

    const update = (next: AudioEffects) => {
      const value = normalizeAudioEffects(next);
      const angle = value.reverbMix * (Math.PI / 2);
      filter.frequency.value = value.lowPassHz ?? MAX_LOW_PASS_HZ;
      dry.gain.value = Math.cos(angle);
      wet.gain.value = Math.sin(angle);
    };
    update(normalized);

    return {
      update,
      dispose: () => {
        try {
          input?.disconnect();
          for (const node of nodes) node.disconnect();
          // Howler may return an HTMLAudioElement to its shared pool. Keep its
          // permanently-associated media source audible for later reuse.
          if (reroutedHtmlElement) input?.connect(output);
        } catch {
          // The Howler sound may already have disconnected during unload.
        }
      },
    };
  } catch {
    // createMediaElementSource permanently redirects an element. Restore a
    // direct connection if a later graph operation failed.
    if (reroutedHtmlElement && input) {
      try {
        input.disconnect();
        input.connect(output);
      } catch {
        // Leave playback error handling to Howler.
      }
    }
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        // Ignore partially-created graph cleanup failures.
      }
    }
    return undefined;
  }
}
