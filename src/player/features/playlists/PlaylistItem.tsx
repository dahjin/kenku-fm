import React from "react";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import { backgrounds, isBackground } from "../../backgrounds";
import { LibraryCard } from "../../common/LibraryCard";
import { editPlaylist, Playlist, Track } from "./playlistsSlice";
import { getFilteredTracks } from "./playlistTags";
import { useDispatch, useSelector, useStore } from "react-redux";
import { RootState } from "../../app/store";
import { playPause, startQueue } from "./playlistPlaybackSlice";
import { TagFilters } from "./TagFilters";
import { playlistQuickPlay } from "./playlistQuickPlay";

type PlaylistItemProps = {
  playlist: Playlist;
  onSelect: (id: string) => void;
  onPlay: (track: Track) => void;
  quickControls?: boolean;
};
export function PlaylistItem({
  playlist,
  onSelect,
  onPlay,
  quickControls = false,
}: PlaylistItemProps) {
  const tracks = useSelector((state: RootState) => state.playlists.tracks);
  const playing = useSelector(
    (state: RootState) =>
      state.playlistPlayback.playing &&
      state.playlistPlayback.queue?.playlistId === playlist.id,
  );
  const store = useStore<RootState>();
  const dispatch = useDispatch();
  const image = isBackground(playlist.background)
    ? backgrounds[playlist.background]
    : playlist.background;
  const matching = getFilteredTracks(playlist, tracks);
  const selected = playlist.tagFilter ?? [];
  function play(value: Playlist, filtering = false) {
    const state = store.getState();
    const decision = playlistQuickPlay(
      value,
      state.playlists.tracks,
      state.playlistPlayback,
      filtering,
    );
    if (decision.type === "pause" || decision.type === "resume")
      dispatch(playPause(decision.type === "resume"));
    if (decision.type === "play") {
      dispatch(
        startQueue({
          tracks: value.tracks,
          trackId: decision.trackId,
          playlistId: value.id,
        }),
      );
      onPlay(state.playlists.tracks[decision.trackId]);
    }
  }
  function filter(tagFilter: string[]) {
    const value = { ...playlist, tagFilter };
    dispatch(editPlaylist({ id: playlist.id, tagFilter }));
    play(value, true);
  }
  return (
    <LibraryCard
      title={playlist.title}
      image={image}
      onOpen={() => onSelect(playlist.id)}
      action={
        <Tooltip title={playing ? "Pause playlist" : "Play matching tracks"}>
          <span>
            <IconButton
              aria-label={`${playing ? "Pause" : "Play"} ${playlist.title}`}
              disabled={!playing && !matching.length}
              onClick={() => play(playlist)}
              sx={{ color: "white", bgcolor: "#00000044" }}
            >
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {quickControls && (
        <Stack spacing={1}>
          <TagFilters playlist={playlist} tracks={tracks} onChange={filter} />
          <Typography
            variant="caption"
            color={matching.length ? "text.secondary" : "warning.main"}
          >
            {matching.length} matching{" "}
            {matching.length === 1 ? "track" : "tracks"}
            {selected.length > 1 ? " · matches all tags" : ""}
          </Typography>
        </Stack>
      )}
    </LibraryCard>
  );
}
