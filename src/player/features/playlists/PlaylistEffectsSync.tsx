import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import type { Track } from "./playlistsSlice";

type Props = {
  onEffects: (track: Track) => void;
};

/** Keeps edits from track settings in sync with an already-playing track. */
export function PlaylistEffectsSync({ onEffects }: Props) {
  const track = useSelector((state: RootState) => {
    const id = state.playlistPlayback.track?.id;
    return id ? state.playlists.tracks[id] : undefined;
  });

  useEffect(() => {
    if (track) onEffects(track);
  }, [track, onEffects]);

  return <></>;
}
