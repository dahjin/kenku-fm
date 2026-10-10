import type { Playlist, Track } from "./playlistsSlice";
import type { PlaylistPlaybackState } from "./playlistPlaybackSlice";
import { chooseSmartTrack, smartShuffleEnabled } from "./smartShuffle";
import { getFilteredTracks } from "./playlistTags";

type Decision =
  | { type: "none" | "pause" | "resume" }
  | { type: "play"; trackId: string };
/** Reuse a paused track only if it is still included in the chosen tags. */
export function playlistQuickPlay(
  playlist: Playlist,
  tracks: Record<string, Track>,
  playback: PlaylistPlaybackState,
  filtering = false,
  random = Math.random,
): Decision {
  const ownsQueue = playback.queue?.playlistId === playlist.id;
  const matching = getFilteredTracks(playlist, tracks);
  if (filtering && (!ownsQueue || !playback.playing)) return { type: "none" };
  if (!filtering && ownsQueue && playback.playing) return { type: "pause" };
  if (!matching.length)
    return { type: ownsQueue && playback.playing ? "pause" : "none" };
  if (ownsQueue && matching.includes(playback.track?.id))
    return { type: filtering ? "none" : "resume" };
  return {
    type: "play",
    trackId: smartShuffleEnabled(playlist, playback.shuffle, playback.repeat)
      ? chooseSmartTrack(
          matching,
          tracks,
          playlist,
          playback.recentByPlaylist?.[playlist.id],
          random,
        )
      : matching[playback.shuffle ? Math.floor(random() * matching.length) : 0],
  };
}
