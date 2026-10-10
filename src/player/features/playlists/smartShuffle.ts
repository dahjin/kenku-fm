import type { Playlist, Track } from "./playlistsSlice";
import { normalizeTags } from "./playlistTags";

export function smartShuffleEnabled(
  playlist: Playlist,
  shuffle: boolean,
  repeat: string,
) {
  return Boolean(playlist.smartShuffle && shuffle && repeat === "playlist");
}
export function trackWeight(track: Track, playlist: Playlist) {
  const frequency = Number.isFinite(track.frequency)
    ? Math.max(0.1, Math.min(10, track.frequency))
    : 1;
  // Use the strongest preferred tag, so heavily tagged tracks don't multiply their advantage.
  const priority = Math.max(
    1,
    ...normalizeTags(track.tags ?? []).map((tag) => {
      const value = playlist.tagPriorities?.[tag];
      return Number.isFinite(value) ? Math.max(1, Math.min(10, value)) : 1;
    }),
  );
  return frequency * priority;
}
export function chooseSmartTrack(
  ids: string[],
  tracks: Record<string, Track>,
  playlist: Playlist,
  recent: string[] = [],
  random = Math.random,
): string | undefined {
  const eligible = [...new Set(ids)].filter((id) => tracks[id]);
  const count = Number.isFinite(playlist.avoidRecent)
    ? Math.max(0, Math.min(100, Math.floor(playlist.avoidRecent)))
    : 3;
  const blocked = count ? recent.slice(-count) : [];
  let choices = eligible.filter((id) => !blocked.includes(id));
  // Relax the oldest exclusions first when a small filtered pool would otherwise be silent.
  while (!choices.length && blocked.length) {
    blocked.shift();
    choices = eligible.filter((id) => !blocked.includes(id));
  }
  if (!choices.length) return undefined;
  const weights = choices.map((id) => trackWeight(tracks[id], playlist));
  let draw = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < choices.length; i++) {
    draw -= weights[i];
    if (draw < 0) return choices[i];
  }
  return choices[choices.length - 1];
}

type Session = {
  ids: string[];
  cursor: number;
  planned?: { id: string; index?: number };
  key?: string;
};
/** Stable preload choice, plus back/forward navigation through what actually played. */
export class SmartShufflePlanner {
  private sessions = new Map<string, Session>();
  constructor(private random = Math.random) {}
  private session(id: string) {
    if (!this.sessions.has(id)) this.sessions.set(id, { ids: [], cursor: -1 });
    return this.sessions.get(id);
  }
  clearPending(id: string) {
    const session = this.session(id);
    session.planned = undefined;
    session.key = undefined;
  }
  choose(
    direction: 1 | -1,
    playlist: Playlist,
    tracks: Record<string, Track>,
    eligible: string[],
    recent: string[],
  ) {
    const session = this.session(playlist.id);
    for (
      let index = session.cursor + direction;
      index >= 0 && index < session.ids.length;
      index += direction
    ) {
      const id = session.ids[index];
      if (eligible.includes(id) && tracks[id]) {
        session.planned = { id, index };
        session.key = undefined;
        return id;
      }
    }
    if (direction === -1)
      return eligible.includes(session.ids[session.cursor])
        ? session.ids[session.cursor]
        : undefined;
    const key = JSON.stringify([
      eligible.map((id) => [
        id,
        tracks[id] && trackWeight(tracks[id], playlist),
      ]),
      playlist.avoidRecent,
      recent,
    ]);
    if (session.key !== key || !session.planned) {
      const id = chooseSmartTrack(
        eligible,
        tracks,
        playlist,
        recent,
        this.random,
      );
      session.planned = id ? { id } : undefined;
      session.key = key;
    }
    return session.planned?.id;
  }
  commit(playlistId: string, id: string, manual = false) {
    const session = this.session(playlistId);
    if (
      !manual &&
      session.planned?.id === id &&
      session.planned.index !== undefined
    )
      session.cursor = session.planned.index;
    else {
      session.ids = [...session.ids.slice(0, session.cursor + 1), id].slice(
        -100,
      );
      session.cursor = session.ids.length - 1;
    }
    this.clearPending(playlistId);
  }
}
