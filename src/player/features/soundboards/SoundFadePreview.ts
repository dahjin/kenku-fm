import { Howl, HowlOptions } from "howler";
import {
  attachHowlAudioEffects,
  AudioEffectGraph,
  AudioEffects,
} from "../../common/audioEffects";

const TRANSITION_LEAD_SECONDS = 1.5;
const MIN_INCOMING_PREVIEW_SECONDS = 2.5;
const INCOMING_TAIL_SECONDS = 1.5;

export function loopTransitionPreviewWindow(
  durationSeconds: number,
  fadeOutMilliseconds: number,
) {
  const duration = Math.max(0, durationSeconds);
  const fadeOut = Math.max(0, fadeOutMilliseconds) / 1000;
  const transitionAt = Math.max(0, duration - fadeOut);
  const start = Math.max(0, transitionAt - TRANSITION_LEAD_SECONDS);
  return {
    start,
    transitionDelayMilliseconds: Math.max(0, transitionAt - start) * 1000,
  };
}

export function incomingPreviewDuration(fadeInMilliseconds: number) {
  return (
    Math.max(
      MIN_INCOMING_PREVIEW_SECONDS,
      Math.max(0, fadeInMilliseconds) / 1000 + INCOMING_TAIL_SECONDS,
    ) * 1000
  );
}

type SoundFadePreviewOptions = AudioEffects & {
  src: string;
  volume: number;
  fadeInMilliseconds: number;
  fadeOutMilliseconds: number;
  onPlaying: () => void;
  onFinish: () => void;
  onError: () => void;
};

type HowlFactory = (options: HowlOptions) => Howl;

/** Auditions the end-to-beginning crossfade without enabling a real loop. */
export class SoundFadePreview {
  private howls = new Set<Howl>();
  private effectGraphs = new Map<Howl, AudioEffectGraph>();
  private transitionTimer?: ReturnType<typeof setTimeout>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(
    private options: SoundFadePreviewOptions,
    private createHowl: HowlFactory = (options) => new Howl(options),
  ) {}

  start() {
    if (this.disposed || this.howls.size > 0) return;
    const options = this.options;
    const fadeOut = Math.max(0, options.fadeOutMilliseconds);

    try {
      const outgoing = this.makeHowl({
        volume: options.volume,
        onplay: (soundId) => {
          if (this.disposed) return;
          const duration = outgoing.duration();
          if (!Number.isFinite(duration) || duration <= 0) {
            this.fail();
            return;
          }

          const window = loopTransitionPreviewWindow(duration, fadeOut);
          outgoing.seek(window.start, soundId);
          this.attachEffects(outgoing, soundId);
          this.transitionTimer = setTimeout(() => {
            if (this.disposed) return;
            if (fadeOut > 0) {
              const currentVolume = outgoing.volume(soundId);
              outgoing.fade(
                typeof currentVolume === "number"
                  ? currentVolume
                  : options.volume,
                0,
                fadeOut,
                soundId,
              );
            }
            this.startIncoming();
          }, window.transitionDelayMilliseconds);
          options.onPlaying();
        },
        // The incoming sound owns completion of the combined preview.
        onend: () => {},
      });
    } catch {
      this.fail();
    }
  }

  stop() {
    this.dispose();
  }

  private startIncoming() {
    const options = this.options;
    const fadeIn = Math.max(0, options.fadeInMilliseconds);
    try {
      const incoming = this.makeHowl({
        volume: fadeIn > 0 ? 0 : options.volume,
        onplay: (soundId) => {
          if (this.disposed) return;
          this.attachEffects(incoming, soundId);
          if (fadeIn > 0) {
            incoming.fade(0, options.volume, fadeIn, soundId);
          }
          this.stopTimer = setTimeout(
            () => this.finish(),
            incomingPreviewDuration(fadeIn),
          );
        },
        onend: () => this.finish(),
      });
    } catch {
      this.fail();
    }
  }

  private makeHowl(
    callbacks: Pick<HowlOptions, "onplay" | "onend" | "volume">,
  ) {
    const howl = this.createHowl({
      src: this.options.src,
      html5: true,
      loop: false,
      autoplay: true,
      preload: true,
      volume: callbacks.volume,
      onplay: callbacks.onplay,
      onend: callbacks.onend,
      onloaderror: () => this.fail(),
      onplayerror: () => this.fail(),
    });
    this.howls.add(howl);
    return howl;
  }

  private attachEffects(howl: Howl, soundId: number) {
    const graph = attachHowlAudioEffects(howl, soundId, this.options);
    if (graph) this.effectGraphs.set(howl, graph);
  }

  private finish() {
    if (this.disposed) return;
    this.dispose();
    this.options.onFinish();
  }

  private fail() {
    if (this.disposed) return;
    this.dispose();
    this.options.onError();
  }

  private dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    for (const graph of this.effectGraphs.values()) graph.dispose();
    for (const howl of this.howls) howl.unload();
    this.effectGraphs.clear();
    this.howls.clear();
  }
}
