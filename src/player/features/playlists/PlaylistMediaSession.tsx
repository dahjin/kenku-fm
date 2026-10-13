import React, { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { playPause } from "./playlistPlaybackSlice";

type PlaylistMediaSessionProps = {
  onSeek: (to: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
};

export function PlaylistMediaSession({
  onSeek,
  onNext,
  onPrevious,
  onStop,
}: PlaylistMediaSessionProps) {
  const track = useSelector((state: RootState) => state.playlistPlayback.track);
  const playing = useSelector(
    (state: RootState) => state.playlistPlayback.playing,
  );
  const dispatch = useDispatch();

  // Handle media session actions
  useEffect(() => {
    navigator.mediaSession.setActionHandler("play", () => {
      dispatch(playPause(true));
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      dispatch(playPause(false));
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      onStop();
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (typeof details.seekTime === "number") {
        onSeek(details.seekTime);
      }
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      onPrevious();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      onNext();
    });
  }, [onStop, onSeek, onPrevious, onNext]);

  // Update media sesssion metadata with current track
  useEffect(() => {
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [track]);

  // Update media session playback state
  useEffect(() => {
    if (playing) {
      navigator.mediaSession.playbackState = "playing";
    } else {
      navigator.mediaSession.playbackState = "paused";
    }
  }, [playing]);

  return <></>;
}
