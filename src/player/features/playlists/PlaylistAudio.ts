import { Howl, HowlOptions } from "howler";
import { trackBounds } from "./trackMarkers";
import type { Track } from "./playlistsSlice";

export function crossfadeDuration(
  seconds: number,
  outgoing: number,
  incoming: number,
): number {
  if (![seconds, outgoing, incoming].every(Number.isFinite)) return 0;
  return Math.max(0, Math.min(seconds, 30, outgoing / 2, incoming / 2));
}

type Entry = {
  track: Track;
  howl: Howl;
  loaded: boolean;
  soundId?: number;
};
type Options = {
  next: () => Track | undefined;
  crossfade: () => number;
  onStart: (track: Track, duration: number, playing: boolean) => void;
  onProgress: (seconds: number) => void;
  onStop: () => void;
  onError: (message: string) => void;
};

/** Owns both sides of a transition, including preload, cancellation and gain. */
export class PlaylistAudio {
  private current?: Entry;
  private upcoming?: Entry;
  private pending?: Entry;
  private outgoing?: Entry;
  private fadeSeconds = 0;
  private transitionOverride?: number;
  private stopping?: { position: number; seconds: number; gain: number };

  private bounds(entry: Entry) {
    return trackBounds(entry.track, entry.howl.duration());
  }
  private position(entry: Entry) {
    return Number(entry.howl.seek(entry.soundId));
  }
  private playing(entry: Entry) {
    return entry.howl.playing(entry.soundId);
  }
  private setVolume(entry: Entry, value: number) {
    entry.howl.volume(value, entry.soundId);
  }
  private crossfade() {
    return this.current?.track.crossfadeSeconds ?? this.options.crossfade();
  }
  private paused = true;
  private resumeOnLoad = true;
  private automaticPending = false;
  private outgoingGain = 1;
  private level = 1;
  private muted = false;
  private lastProgress = -1;
  private failedPreload?: string;

  constructor(
    private options: Options,
    private create = (options: HowlOptions) => new Howl(options),
  ) {}

  private same(entry: Entry | undefined, track: Track | undefined) {
    return (
      entry &&
      track &&
      entry.track.id === track.id &&
      entry.track.url === track.url &&
      entry.track.startSeconds === track.startSeconds &&
      entry.track.endSeconds === track.endSeconds &&
      entry.track.crossfadeSeconds === track.crossfadeSeconds
    );
  }

  private unload(entry?: Entry) {
    if (!entry) return;
    entry.howl.off();
    entry.howl.unload();
  }

  private make(track: Track): Entry {
    const howl = this.create({
      src: track.url,
      html5: true,
      volume: 0,
      mute: this.muted,
    });
    const entry: Entry = { track, howl, loaded: false };
    howl.once("load", () => {
      if (entry !== this.pending && entry !== this.upcoming) return;
      entry.loaded = true;
      if (entry === this.pending) {
        if (this.automaticPending) {
          const next = this.options.next();
          if (!this.same(entry, next)) {
            if (next) this.play(next, true);
            else this.stop();
            return;
          }
        }
        this.activate(entry);
      }
    });
    howl.on("end", () => {
      if (entry !== this.current || this.pending) return;
      if (this.stopping) {
        this.stop();
        return;
      }
      const next = this.options.next();
      if (next) this.play(next, true);
      else this.stop();
    });
    const error = () => {
      if (![this.current, this.upcoming, this.pending].includes(entry)) return;
      this.failedPreload = track.id + track.url;
      if (entry === this.upcoming) this.upcoming = undefined;
      if (entry === this.pending || entry === this.current) {
        this.pending = undefined;
        this.stop();
      }
      this.unload(entry);
      if (entry === this.current) this.current = undefined;
      this.options.onError(`Unable to play track: ${track.title}`);
    };
    howl.on("loaderror", error);
    howl.on("playerror", error);
    return entry;
  }

  play(track: Track, automatic = false, transitionSeconds?: number) {
    this.stopping = undefined;
    this.transitionOverride = transitionSeconds;
    this.resumeOnLoad = true;
    this.automaticPending = automatic;
    this.unload(this.pending);
    this.pending = undefined;
    if (this.same(this.upcoming, track)) {
      this.pending = this.upcoming;
      this.upcoming = undefined;
    } else {
      this.unload(this.upcoming);
      this.upcoming = undefined;
      this.pending = this.make(track);
    }
    if (this.pending.loaded) this.activate(this.pending);
  }

  private activate(entry: Entry) {
    const old = this.current;
    this.unload(this.outgoing);
    this.outgoing = undefined;
    const remaining = old
      ? Math.max(0, this.bounds(old).end - this.position(old))
      : 0;
    this.fadeSeconds =
      old && this.playing(old)
        ? Math.min(
            remaining,
            crossfadeDuration(
              this.transitionOverride ?? this.crossfade(),
              this.bounds(old).length,
              this.bounds(entry).length,
            ),
          )
        : 0;
    this.outgoingGain =
      old && this.level > 0
        ? Number(old.howl.volume(old.soundId)) / this.level
        : 1;
    if (old && this.fadeSeconds > 0) this.outgoing = old;
    else this.unload(old);
    this.current = entry;
    this.transitionOverride = undefined;
    if (this.pending === entry) this.pending = undefined;
    if (this.upcoming === entry) this.upcoming = undefined;
    this.failedPreload = undefined;
    this.paused = !this.resumeOnLoad;
    this.lastProgress = -1;
    this.setVolume(entry, this.fadeSeconds > 0 ? 0 : this.level);
    entry.howl.mute(this.muted, entry.soundId);
    // Keep one Howler sound instance for its entire lifetime. Calling play()
    // without this ID on resume creates a new HTML5 audio node at time zero.
    entry.soundId = entry.howl.play();
    entry.howl.seek(this.bounds(entry).start, entry.soundId);
    if (!this.resumeOnLoad) entry.howl.pause(entry.soundId);
    this.options.onStart(
      { ...entry.track, startSeconds: this.bounds(entry).start },
      this.bounds(entry).end,
      this.resumeOnLoad,
    );
    this.options.onProgress(this.bounds(entry).start);
  }

  tick() {
    const current = this.current;
    if (!current || this.paused || !this.playing(current)) return;
    const position = this.position(current);
    const seconds = Math.max(
      this.bounds(current).start,
      Math.round(position * 10) / 10,
    );
    if (seconds !== this.lastProgress) {
      this.options.onProgress(seconds);
      this.lastProgress = seconds;
    }
    this.applyVolume();
    if (this.stopping) {
      if (
        position - this.stopping.position >= this.stopping.seconds ||
        position >= this.bounds(current).end
      )
        this.stop();
      return;
    }
    if (
      this.outgoing &&
      position - this.bounds(current).start >= this.fadeSeconds
    ) {
      this.unload(this.outgoing);
      this.outgoing = undefined;
      this.fadeSeconds = 0;
    }
    if (position >= this.bounds(current).end) {
      current.howl.pause(current.soundId);
      if (!this.pending) {
        const next = this.options.next();
        if (next) this.play(next, true);
        else this.stop();
      }
      return;
    }
    if (this.pending || this.outgoing) return;
    const next = this.options.next();
    if (!this.same(this.upcoming, next)) {
      this.unload(this.upcoming);
      this.upcoming = undefined;
    }
    // Only preload when crossfading is enabled. Re-evaluate filters every tick.
    if (!next || this.crossfade() <= 0) return;
    if (!this.upcoming && this.failedPreload !== next.id + next.url)
      this.upcoming = this.make(next);
    if (this.upcoming?.loaded) {
      const duration = crossfadeDuration(
        this.crossfade(),
        this.bounds(current).length,
        this.bounds(this.upcoming).length,
      );
      if (duration > 0 && this.bounds(current).end - position <= duration)
        this.activate(this.upcoming);
    }
  }

  private applyVolume() {
    const fraction =
      this.outgoing && this.fadeSeconds > 0
        ? Math.min(
            1,
            Math.max(
              0,
              (this.position(this.current) - this.bounds(this.current).start) /
                this.fadeSeconds,
            ),
          )
        : 1;
    const stopGain = this.stopping
      ? this.stopping.gain *
        Math.max(
          0,
          1 -
            (this.position(this.current) - this.stopping.position) /
              this.stopping.seconds,
        )
      : fraction;
    if (this.current) this.setVolume(this.current, this.level * stopGain);
    if (this.outgoing)
      this.setVolume(
        this.outgoing,
        this.level * this.outgoingGain * (1 - fraction),
      );
  }

  seek(seconds: number) {
    this.unload(this.outgoing);
    this.outgoing = undefined;
    this.fadeSeconds = 0;
    this.stopping = undefined;
    if (this.current) {
      const bounds = this.bounds(this.current);
      seconds = Math.max(bounds.start, Math.min(bounds.end, seconds));
      this.current.howl.seek(seconds, this.current.soundId);
    }
    this.applyVolume();
    this.options.onProgress(seconds);
  }

  pauseResume(resume: boolean) {
    this.paused = !resume;
    this.resumeOnLoad = resume;
    for (const entry of [this.current, this.outgoing]) {
      if (!entry) continue;
      if (resume) {
        if (!this.playing(entry)) entry.howl.play(entry.soundId);
      } else entry.howl.pause(entry.soundId);
    }
  }

  volume(value: number) {
    this.level = value;
    this.applyVolume();
  }
  mute(value: boolean) {
    this.muted = value;
    for (const entry of [
      this.current,
      this.outgoing,
      this.upcoming,
      this.pending,
    ])
      if (entry) entry.howl.mute(value, entry.soundId);
  }

  retainCurrent() {
    this.unload(this.pending);
    this.unload(this.upcoming);
    this.pending = this.upcoming = undefined;
    this.stopping = undefined;
    this.applyVolume();
  }

  fadeOut(seconds: number) {
    if (!this.current || !this.playing(this.current) || seconds <= 0) {
      this.stop();
      return;
    }
    this.unload(this.upcoming);
    this.unload(this.pending);
    this.unload(this.outgoing);
    this.upcoming = this.pending = this.outgoing = undefined;
    this.stopping = {
      position: this.position(this.current),
      seconds: Math.min(30, seconds),
      gain:
        this.level > 0
          ? Number(this.current.howl.volume(this.current.soundId)) / this.level
          : 1,
    };
  }

  stop() {
    this.stopping = undefined;
    this.paused = true;
    this.unload(this.outgoing);
    this.unload(this.upcoming);
    this.unload(this.pending);
    this.outgoing = this.upcoming = this.pending = undefined;
    this.fadeSeconds = 0;
    if (this.current) {
      this.current.howl.stop(this.current.soundId);
      this.current.howl.seek(
        this.bounds(this.current).start,
        this.current.soundId,
      );
    }
    this.options.onStop();
  }

  dispose() {
    for (const entry of [
      this.current,
      this.outgoing,
      this.upcoming,
      this.pending,
    ])
      this.unload(entry);
    this.current = this.outgoing = this.upcoming = this.pending = undefined;
  }
}
