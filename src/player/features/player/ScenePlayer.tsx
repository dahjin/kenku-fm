import React from "react";
import Layers from "@mui/icons-material/LayersRounded";
import Stop from "@mui/icons-material/StopRounded";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import type { RootState } from "../../app/store";
import { stopScene } from "../scenes/scenesSlice";

export function ScenePlayer() {
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const dispatch = useDispatch();

  if (!active) return null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ pb: 1, mb: 1, borderBottom: 1, borderColor: "divider" }}
    >
      <Box sx={{ display: "flex", color: "primary.main" }}>
        <Layers fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Active scene
        </Typography>
        <Typography variant="body2" noWrap>
          {active.sceneTitle} · {active.tab.title}
        </Typography>
      </Box>
      <Button
        component={RouterLink}
        to={`/scenes?scene=${encodeURIComponent(active.sceneId)}`}
        size="small"
      >
        Open
      </Button>
      <Tooltip title="Stop scene">
        <IconButton
          size="small"
          aria-label="Stop scene"
          onClick={() => dispatch(stopScene())}
        >
          <Stop fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
