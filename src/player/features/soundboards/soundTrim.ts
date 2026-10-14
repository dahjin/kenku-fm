export type SoundTrim = {
  startSeconds?: number;
  endSeconds?: number | null;
};

/** Normalizes saved trim markers against the duration of the current file. */
export function soundBounds(sound: SoundTrim, duration: number) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const requestedStart = sound.startSeconds ?? 0;
  const start =
    Number.isFinite(requestedStart) &&
    requestedStart >= 0 &&
    requestedStart < safeDuration
      ? requestedStart
      : 0;
  const requestedEnd = sound.endSeconds;
  const end =
    Number.isFinite(requestedEnd) && requestedEnd > start
      ? Math.min(requestedEnd, safeDuration)
      : safeDuration;
  return { start, end, length: Math.max(0, end - start) };
}

/** Returns persisted markers that can be configured before media loads. */
export function savedSoundBounds(sound: SoundTrim) {
  const requestedStart = sound.startSeconds ?? 0;
  const start =
    Number.isFinite(requestedStart) && requestedStart >= 0 ? requestedStart : 0;
  const requestedEnd = sound.endSeconds;
  const end =
    Number.isFinite(requestedEnd) && requestedEnd > start ? requestedEnd : null;
  return { start, end, length: end === null ? null : end - start };
}
