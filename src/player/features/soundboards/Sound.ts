import { Howl } from "howler";
import { RepeatInterval, RepeatTimer } from "./repeatInterval";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  attachHowlAudioEffects,
  AudioEffectGraph,
  AudioEffects,
  hasAudioEffects,
} from "../../common/audioEffects";
import { savedSoundBounds, soundBounds } from "./soundTrim";

export interface SoundEvents {
  error: () => void;
  load: (duration: number) => void;
  end: () => void;
  waiting: () => void;
  playing: () => void;
}

type SoundOptions = AudioEffects & {
  repeatInterval?: RepeatInterval | null;
  src: string;
  volume: number;
  loop: boolean;
  fadeIn: number;
  fadeOut: number;
  startSeconds?: number;
  endSeconds?: number | null;
};

/**
 * Cross fade wrapper around a Howler sound playback.
 * Setting fadeIn and fadeOut to 0 will disable cross fading.
 * If cross fading is disabled then HTML5 audio won't be used
 * this increases the memory usage but allows for perfect loops.
 */
export class Sound extends TypedEmitter<SoundEvents> {
  options: SoundOptions;
  private repeatTimer = new RepeatTimer();
  private stopped = false;
  private waiting = false;
  private activeHowls = new Set<Howl>();
  private effectGraphs = new Map<Howl, AudioEffectGraph>();
  private soundIds = new Map<Howl, number>();
  private trimSprites = new Map<Howl, [number, number, boolean]>();
  private playbackStarts = new Map<Howl, number>();
  private manualRangeHowls = new Set<Howl>();
  /** Timeout that controls the cross-fade */
  _timeout: NodeJS.Timeout;
  /** Current howl audio playabck for this loop */
  _howl: Howl;

  constructor(options: SoundOptions) {
    super();
    this.options = {
      ...options,
      loop: options.repeatInterval ? false : options.loop,
    };
    try {
      const createHowlerInstance = () => {
        const crossFade =
          this.options.fadeIn !== 0 && this.options.fadeOut !== 0;
        const savedBounds = savedSoundBounds(this.options);
        const trimSprite: [number, number, boolean] | undefined =
          savedBounds.end !== null
            ? [
                Math.round(savedBounds.start * 1000),
                Math.round(savedBounds.length * 1000),
                !crossFade && this.options.loop,
              ]
            : undefined;
        const manualRange = savedBounds.start > 0 && !trimSprite && !crossFade;
        const howl = new Howl({
          src: this.options.src,
          loop:
            crossFade || trimSprite || manualRange ? false : this.options.loop,
          volume: crossFade ? 0 : this.options.volume,
          autoplay: !trimSprite,
          sprite: trimSprite ? { trimmed: trimSprite } : undefined,
          // Disable html audio when not cross fading to allow for perfect looping
          html5: crossFade,
        });

        const handleCrossFade = () => {
          // Fade in
          howl.fade(0, this.options.volume, options.fadeIn);
          // Fade out
          this._timeout = setTimeout(
            () => {
              if (this.options.loop) {
                // Cross fade on loop
                howl.once("fade", () => {
                  this.disposeHowl(howl);
                });
                howl.fade(howl.volume(), 0, this.options.fadeOut);
                createHowlerInstance();
              } else {
                // Basic fade out when not looping
                howl.fade(howl.volume(), 0, this.options.fadeOut);
              }
            },
            Math.max(
              0,
              Math.floor(
                trimSprite
                  ? trimSprite[1]
                  : soundBounds(this.options, howl.duration()).length * 1000,
              ) - this.options.fadeOut,
            ),
          );
        };

        const handleLoad = () => {
          const bounds = soundBounds(this.options, howl.duration());
          this.playbackStarts.set(howl, bounds.start);
          this.emit("load", bounds.length);
          if (trimSprite && !this.stopped) this.playHowl(howl);
        };

        const handleEnd = () => {
          if (this.stopped) return;
          if (this.options.repeatInterval) {
            this.scheduleRepeat();
          } else if (manualRange && this.options.loop) {
            this.playHowl(howl);
          } else if (!this.options.loop) {
            this.emit("end");
          }
        };

        const handleError = () => {
          this.repeatTimer.cancel();
          this.emit("error");
        };

        howl.on("play", (soundId) => {
          if (typeof soundId === "number") {
            this.soundIds.set(howl, soundId);
            if (savedBounds.start > 0 && !trimSprite)
              howl.seek(savedBounds.start, soundId);
            if (!this.effectGraphs.has(howl)) {
              const graph = attachHowlAudioEffects(howl, soundId, this.options);
              if (graph) this.effectGraphs.set(howl, graph);
            }
          }
          if (crossFade) handleCrossFade();
        });
        howl.on("play", () => {
          this.waiting = false;
          this.emit("playing");
        });
        howl.on("load", handleLoad);
        howl.on("end", handleEnd);
        howl.on("loaderror", handleError);
        howl.on("playerror", handleError);

        const howlSound = (howl as unknown as { _sounds?: readonly unknown[] })
          ._sounds?.[0];
        if (!howlSound) {
          handleError();
        }

        this.activeHowls.add(howl);
        if (trimSprite) this.trimSprites.set(howl, trimSprite);
        if (manualRange) this.manualRangeHowls.add(howl);
        this._howl = howl;
      };
      createHowlerInstance();
    } catch {
      this.emit("error");
    }
  }

  private disposeHowl(howl: Howl) {
    this.effectGraphs.get(howl)?.dispose();
    this.effectGraphs.delete(howl);
    this.soundIds.delete(howl);
    this.trimSprites.delete(howl);
    this.playbackStarts.delete(howl);
    this.manualRangeHowls.delete(howl);
    this.activeHowls.delete(howl);
    howl.unload();
  }

  private disposeAllHowls() {
    for (const howl of [...this.activeHowls]) this.disposeHowl(howl);
  }

  private scheduleRepeat() {
    if (this.stopped || !this.options.repeatInterval) return;
    this.waiting = true;
    this.repeatTimer.start(this.options.repeatInterval, () => {
      if (!this.stopped) this.playHowl(this._howl);
    });
    this.emit("waiting");
  }

  private playHowl(howl: Howl) {
    return this.trimSprites.has(howl) ? howl.play("trimmed") : howl.play();
  }

  repeat(interval: RepeatInterval | null | undefined) {
    const previous = this.options.repeatInterval;
    if (
      previous?.minSeconds === interval?.minSeconds &&
      previous?.maxSeconds === interval?.maxSeconds
    )
      return;
    this.options.repeatInterval = interval;
    if (interval) this.loop(false);
    if (this.waiting) {
      this.repeatTimer.cancel();
      if (interval) this.scheduleRepeat();
      else if (this.options.loop) this.playHowl(this._howl);
      else this.emit("end");
    }
  }

  async stop(fadeOut: boolean): Promise<void> {
    this.stopped = true;
    this.repeatTimer.cancel();
    return new Promise((resolve) => {
      clearTimeout(this._timeout);
      if (!this._howl) {
        resolve();
        return;
      }
      if (fadeOut && this._howl.playing() && this.options.fadeOut > 0) {
        this._howl.once("fade", () => {
          this.disposeAllHowls();
          resolve();
        });
        this._howl.fade(this._howl.volume(), 0, this.options.fadeOut);
      } else {
        this.disposeAllHowls();
        resolve();
      }
    });
  }

  playing() {
    return this._howl.playing();
  }

  progress() {
    const position = this._howl.seek();
    return typeof position === "number"
      ? Math.max(0, position - (this.playbackStarts.get(this._howl) ?? 0))
      : 0;
  }

  seek(to: number) {
    this._howl.seek((this.playbackStarts.get(this._howl) ?? 0) + to);
  }

  volume(volume: number) {
    this.options.volume = volume;
    this._howl.volume(volume);
  }

  effects(effects: AudioEffects) {
    this.options.lowPassHz = effects.lowPassHz;
    this.options.reverbMix = effects.reverbMix;
    for (const howl of this.activeHowls) {
      const graph = this.effectGraphs.get(howl);
      if (graph) graph.update(effects);
      else if (hasAudioEffects(effects)) {
        const soundId = this.soundIds.get(howl);
        if (soundId !== undefined) {
          const next = attachHowlAudioEffects(howl, soundId, effects);
          if (next) this.effectGraphs.set(howl, next);
        }
      }
    }
  }

  loop(loop: boolean) {
    this.options.loop = loop;
    // Toggle howl loop if cross fade is disabled
    if (this.options.fadeIn === 0 || this.options.fadeOut === 0) {
      const sprite = this.trimSprites.get(this._howl);
      if (sprite) sprite[2] = loop;
      this._howl.loop(this.manualRangeHowls.has(this._howl) ? false : loop);
    }
  }
}
