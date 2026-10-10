import type { Track } from "./playlistsSlice";

/** Invalid/outdated markers fall back to a playable range when a file changes. */
export function trackBounds(track: Track, duration: number) {
  const start =
    Number.isFinite(track.startSeconds) &&
    track.startSeconds >= 0 &&
    track.startSeconds < duration
      ? track.startSeconds
      : 0;
  const end =
    Number.isFinite(track.endSeconds) && track.endSeconds > start
      ? Math.min(track.endSeconds, duration)
      : duration;
  return { start, end, length: end - start };
}
