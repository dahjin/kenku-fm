export const DISCORD_ACTIVITY_MAX_LENGTH = 128;

/** Keep presence text useful and within Discord's activity-name limit. */
export function normalizeNowPlaying(title?: unknown) {
  if (typeof title !== "string") return undefined;
  const normalized = title.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return Array.from(normalized).slice(0, DISCORD_ACTIVITY_MAX_LENGTH).join("");
}

export function nowPlayingTitle(playing: boolean, title?: string) {
  return playing ? normalizeNowPlaying(title) : undefined;
}
