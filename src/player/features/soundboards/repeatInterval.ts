export interface RepeatInterval {
  minSeconds: number;
  maxSeconds: number;
}

export function validRepeatInterval(value: RepeatInterval): boolean {
  return (
    Number.isFinite(value.minSeconds) &&
    Number.isFinite(value.maxSeconds) &&
    value.minSeconds >= 0.1 &&
    value.maxSeconds <= 86400 &&
    value.maxSeconds >= value.minSeconds
  );
}

export function repeatDelay(
  value: RepeatInterval,
  random = Math.random,
): number {
  if (!validRepeatInterval(value)) throw new Error("Invalid repeat interval");
  return Math.round(
    (value.minSeconds + random() * (value.maxSeconds - value.minSeconds)) *
      1000,
  );
}

/** One cancellable wait per sound, scheduled only after playback ends. */
export class RepeatTimer {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;

  constructor(
    private schedule = (callback: () => void, delay: number) =>
      setTimeout(callback, delay),
    private clear = (timer: ReturnType<typeof setTimeout>) =>
      clearTimeout(timer),
    private random = Math.random,
  ) {}

  start(interval: RepeatInterval, callback: () => void): number {
    this.cancel();
    const generation = this.generation;
    const delay = repeatDelay(interval, this.random);
    this.timer = this.schedule(() => {
      if (generation !== this.generation) return;
      this.timer = undefined;
      callback();
    }, delay);
    return delay;
  }

  cancel() {
    this.generation += 1;
    if (this.timer !== undefined) this.clear(this.timer);
    this.timer = undefined;
  }
}
