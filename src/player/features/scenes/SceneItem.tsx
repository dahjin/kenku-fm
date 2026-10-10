import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Play from "@mui/icons-material/PlayArrowRounded";
import Stop from "@mui/icons-material/StopRounded";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { backgrounds, isBackground } from "../../backgrounds";
import { LibraryCard } from "../../common/LibraryCard";
import { Scene, activateScene, stopScene } from "./scenesSlice";
import { validRepeatInterval } from "../soundboards/repeatInterval";

export function SceneItem({
  scene,
  onSelect,
}: {
  scene: Scene;
  onSelect: (id: string) => void;
}) {
  const dispatch = useDispatch();
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const playlists = useSelector(
    (state: RootState) => state.playlists.playlists.byId,
  );
  const live = active?.sceneId === scene.id;
  const background =
    scene.background ||
    scene.tabs
      .map((tab) => playlists[tab.music?.playlistId]?.background)
      .find(Boolean) ||
    Object.keys(backgrounds)[0];
  const image = isBackground(background) ? backgrounds[background] : background;
  return (
    <LibraryCard
      title={scene.title || "Untitled scene"}
      image={image}
      onOpen={() => onSelect(scene.id)}
      action={
        live && (
          <Tooltip title="Stop scene">
            <IconButton
              aria-label={`Stop ${scene.title}`}
              onClick={() => dispatch(stopScene())}
              sx={{ color: "white", bgcolor: "#00000044" }}
            >
              <Stop />
            </IconButton>
          </Tooltip>
        )
      }
    >
      <Stack spacing={1}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            maxHeight: 116,
            overflowY: "auto",
          }}
          aria-label={`${scene.title} tabs`}
        >
          {scene.tabs.map((tab) => {
            const selected = live && active.tab.id === tab.id;
            const changed =
              selected &&
              (JSON.stringify(active.tab) !== JSON.stringify(tab) ||
                active.sceneTitle !== scene.title);
            const valid = tab.groups.every((item) =>
              validRepeatInterval(item.interval),
            );
            return (
              <Tooltip
                key={tab.id}
                title={
                  !valid
                    ? "Fix group delays in the scene editor"
                    : changed
                      ? "Activate saved changes"
                      : `Activate ${tab.title}`
                }
              >
                <span>
                  <Chip
                    size="small"
                    icon={<Play />}
                    label={`${tab.title || "Untitled tab"}${selected ? (changed ? " · Updated" : " · Live") : ""}`}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    disabled={!valid}
                    aria-label={`Activate ${scene.title}: ${tab.title}`}
                    onClick={() =>
                      dispatch(
                        activateScene({
                          sceneId: scene.id,
                          sceneTitle: scene.title,
                          tab,
                        }),
                      )
                    }
                  />
                </span>
              </Tooltip>
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {scene.tabs.length
            ? live
              ? `Active: ${active.tab.title} · click a tab to switch`
              : "Click a tab to activate its saved mix"
            : "Open this scene to add a tab"}
        </Typography>
      </Stack>
    </LibraryCard>
  );
}
