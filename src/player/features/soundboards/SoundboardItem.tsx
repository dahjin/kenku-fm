import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/ShuffleRounded";
import Play from "@mui/icons-material/PlayArrowRounded";
import Stop from "@mui/icons-material/StopRounded";
import { backgrounds, isBackground } from "../../backgrounds";
import { LibraryCard } from "../../common/LibraryCard";
import { Sound, Soundboard } from "./soundboardsSlice";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { startGroup, stopGroup } from "./soundboardPlaybackSlice";
import { validRepeatInterval } from "./repeatInterval";

type SoundboardItemProps = {
  soundboard: Soundboard;
  onSelect: (id: string) => void;
  onPlay: (sound: Sound) => void;
  onStop?: (id: string) => void;
  quickControls?: boolean;
};
export function SoundboardItem({
  soundboard,
  onSelect,
  onPlay,
  onStop,
  quickControls = false,
}: SoundboardItemProps) {
  const library = useSelector((state: RootState) => state.soundboards.sounds);
  const activeSoundIds = useSelector(
    (state: RootState) =>
      soundboard.sounds.filter((id) => id in state.soundboardPlayback.playback),
    shallowEqual,
  );
  const activeGroupIds = useSelector(
    (state: RootState) =>
      (soundboard.groups ?? [])
        .map((group) => group.id)
        .filter((id) => id in state.soundboardPlayback.groups),
    shallowEqual,
  );
  const activeSounds = new Set(activeSoundIds);
  const activeGroups = new Set(activeGroupIds);
  const dispatch = useDispatch();
  const sounds = soundboard.sounds.filter((id) => library[id]);
  const groups = soundboard.groups ?? [];
  const image = isBackground(soundboard.background)
    ? backgrounds[soundboard.background]
    : soundboard.background;
  return (
    <LibraryCard
      title={soundboard.title}
      image={image}
      onOpen={() => onSelect(soundboard.id)}
      action={
        <Tooltip title="Play a random sound">
          <span>
            <IconButton
              aria-label={`Play a random sound from ${soundboard.title}`}
              disabled={!sounds.length}
              onClick={() =>
                onPlay(
                  library[sounds[Math.floor(Math.random() * sounds.length)]],
                )
              }
              sx={{ color: "white", bgcolor: "#00000044" }}
            >
              <ShuffleIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {quickControls && (
        <Stack spacing={1}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              maxHeight: 144,
              overflowY: "auto",
            }}
          >
            {sounds.map((id) => {
              const active = activeSounds.has(id);
              return (
                <Chip
                  key={id}
                  size="small"
                  icon={active ? <Stop /> : <Play />}
                  label={library[id].title}
                  color={active ? "primary" : "default"}
                  variant={active ? "filled" : "outlined"}
                  aria-label={`${active && onStop ? "Stop" : "Play"} ${library[id].title}`}
                  onClick={() =>
                    active && onStop ? onStop(id) : onPlay(library[id])
                  }
                />
              );
            })}
            {groups.map((group) => {
              const active = activeGroups.has(group.id);
              return (
                <Chip
                  key={group.id}
                  size="small"
                  icon={active ? <Stop /> : <ShuffleIcon />}
                  label={group.title}
                  color={active ? "secondary" : "default"}
                  variant={active ? "filled" : "outlined"}
                  aria-label={`${active ? "Stop" : "Start"} random group ${group.title}`}
                  disabled={
                    !active &&
                    (!validRepeatInterval(group.interval) ||
                      !group.soundIds.some((id) => library[id]))
                  }
                  onClick={() =>
                    dispatch(
                      active
                        ? stopGroup(group.id)
                        : startGroup({ id: group.id, title: group.title }),
                    )
                  }
                />
              );
            })}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {sounds.length || groups.length
              ? "Click to play · click again to stop"
              : "Open this soundboard to add sounds"}
          </Typography>
        </Stack>
      )}
    </LibraryCard>
  );
}
