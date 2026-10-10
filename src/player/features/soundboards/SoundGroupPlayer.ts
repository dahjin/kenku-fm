import { Sound } from "./Sound";
import { RepeatTimer, validRepeatInterval } from "./repeatInterval";
import type { Sound as SoundData, SoundGroup } from "./soundboardsSlice";

type Options = {
  group: () => SoundGroup | undefined;
  sound: (id: string) => SoundData | undefined;
  status: (waiting: boolean, soundId?: string) => void;
  finish: () => void;
  error: (message: string) => void;
};

export class SoundGroupPlayer {
  private timer = new RepeatTimer();
  private current?: Sound;
  private currentId?: string;
  private stopped = false;
  private waiting = false;
  private intervalKey = "";

  constructor(
    private options: Options,
    private create = (data: SoundData) =>
      new Sound({
        src: data.url,
        volume: data.volume,
        fadeIn: data.fadeIn,
        fadeOut: data.fadeOut,
        loop: false,
        repeatInterval: null,
      }),
    private random = Math.random,
  ) {}

  private choices() {
    const group = this.options.group();
    return (
      group?.soundIds.map((id) => this.options.sound(id)).filter(Boolean) ?? []
    );
  }

  start() {
    this.playNext();
  }

  private clearAudio() {
    if (this.current) {
      this.current.removeAllListeners();
      void this.current.stop(false);
      this.current = undefined;
    }
  }

  private playNext() {
    if (this.stopped) return;
    this.timer.cancel();
    this.clearAudio();
    const group = this.options.group();
    const choices = this.choices();
    if (!group || !choices.length || !validRepeatInterval(group.interval)) {
      this.finish();
      return;
    }
    const selected = choices[Math.floor(this.random() * choices.length)];
    this.waiting = false;
    this.currentId = selected.id;
    let audio: Sound;
    try {
      audio = this.create(selected);
    } catch {
      this.finish();
      this.options.error(`Unable to play group sound: ${selected.title}`);
      return;
    }
    this.current = audio;
    this.options.status(false, selected.id);
    audio.on("end", () => {
      if (this.stopped || this.current !== audio) return;
      this.clearAudio();
      this.wait();
    });
    audio.on("error", () => {
      if (this.stopped || this.current !== audio) return;
      this.finish();
      this.options.error(`Unable to play group sound: ${selected.title}`);
    });
  }

  private wait() {
    const group = this.options.group();
    if (this.stopped) return;
    if (
      !group ||
      !this.choices().length ||
      !validRepeatInterval(group.interval)
    ) {
      this.finish();
      return;
    }
    this.waiting = true;
    this.intervalKey = JSON.stringify(group.interval);
    this.timer.start(group.interval, () => this.playNext());
    this.options.status(true);
  }

  update() {
    if (this.stopped) return;
    const group = this.options.group();
    if (
      !group ||
      !this.choices().length ||
      !validRepeatInterval(group.interval)
    ) {
      this.finish();
      return;
    }
    if (
      this.current &&
      (!group.soundIds.includes(this.currentId) ||
        !this.options.sound(this.currentId))
    ) {
      this.clearAudio();
      this.wait();
    }
    if (this.waiting && this.intervalKey !== JSON.stringify(group.interval))
      this.wait();
    const sound = this.options.sound(this.currentId);
    if (this.current && sound) this.current.volume(sound.volume);
  }

  private finish() {
    this.stop();
    this.options.finish();
  }
  stop() {
    this.stopped = true;
    this.timer.cancel();
    this.clearAudio();
  }
}
