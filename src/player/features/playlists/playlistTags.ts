import type { Playlist, Track } from "./playlistsSlice";
import type { Queue, Repeat } from "./playlistPlaybackSlice";

/** Tags are single words; accept pasted hashtags and comma-separated lists. */
export function normalizeTags(values: string[]): string[] {
  return [
    ...new Set(
      values.flatMap((value) =>
        value
          .toLowerCase()
          .split(/[\s,#]+/)
          .filter(Boolean),
      ),
    ),
  ];
}

export function matchesTags(track: Track, tags: string[]): boolean {
  const trackTags = normalizeTags(track.tags ?? []);
  return normalizeTags(tags).every((tag) => trackTags.includes(tag));
}

export function getFilteredTracks(
  playlist: Playlist,
  tracks: Record<string, Track>,
): string[] {
  return playlist.tracks.filter(
    (id) => tracks[id] && matchesTags(tracks[id], playlist.tagFilter ?? []),
  );
}

export function getPlaylistTags(
  playlist: Playlist,
  tracks: Record<string, Track>,
): string[] {
  return normalizeTags(
    playlist.tracks.flatMap((id) => tracks[id]?.tags ?? []),
  ).sort((a, b) => a.localeCompare(b));
}

/** Return a queue position, preserving the existing shuffle order. */
export function getPlaybackIndex(
  queue: Queue,
  shuffle: boolean,
  repeat: Repeat,
  matchingIds: string[],
  direction: 1 | -1,
  restartCurrent = false,
): number | undefined {
  const matching = new Set(matchingIds);
  const order = shuffle
    ? queue.shuffled
    : queue.tracks.map((_, index) => index);
  const positions = order
    .map((_, index) => index)
    .filter((index) => matching.has(queue.tracks[order[index]]));
  if (!positions.length) return undefined;

  const current = positions.indexOf(queue.current);
  // A filtered-out track may finish, but cannot repeat or be restarted by Previous.
  if (current < 0)
    return direction === 1 ? positions[0] : positions[positions.length - 1];
  if (repeat === "track" || restartCurrent) return queue.current;

  const next = current + direction;
  if (next >= 0 && next < positions.length) return positions[next];
  if (repeat === "off") return undefined;
  return direction === 1 ? positions[0] : positions[positions.length - 1];
}

/** Counts are relative to the current AND-filter, rather than the whole library. */
export function getTagFacets(
  playlist: Playlist,
  tracks: Record<string, Track>,
  selection = playlist.tagFilter ?? [],
) {
  const selected = normalizeTags(selection);
  const matching = getFilteredTracks(
    { ...playlist, tagFilter: selected },
    tracks,
  );
  const counts = new Map<string, number>();
  for (const id of matching)
    for (const tag of normalizeTags(tracks[id].tags ?? []))
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
  // A stale selection must remain removable even when there are no matches.
  for (const tag of selected) if (!counts.has(tag)) counts.set(tag, 0);
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, count]) => ({ tag, count, selected: selected.includes(tag) }));
}
