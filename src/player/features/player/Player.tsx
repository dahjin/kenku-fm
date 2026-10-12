import React from "react";

import Paper from "@mui/material/Paper";
import Container from "@mui/material/Container";

import { SoundboardPlayer } from "./SoundboardPlayer";
import { PlaylistPlayer } from "./PlaylistPlayer";
import { ScenePlayer } from "./ScenePlayer";
import { useDisplayDensity } from "../../common/CompactMode";

type PlayerProps = {
  onPlaylistNext: () => void;
  onPlaylistPrevious: () => void;
  onPlaylistSeek: (to: number) => void;
  onSoundboardStop: (id: string) => void;
};

export function Player({
  onPlaylistNext,
  onPlaylistPrevious,
  onPlaylistSeek,
  onSoundboardStop,
}: PlayerProps) {
  const density = useDisplayDensity();
  return (
    <Container
      sx={{
        position: "fixed",
        bottom: density.playerBottom,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
      }}
      maxWidth="md"
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          p: density.playerPadding,
        }}
      >
        <ScenePlayer />
        <SoundboardPlayer onSoundboardStop={onSoundboardStop} />
        <PlaylistPlayer
          onPlaylistNext={onPlaylistNext}
          onPlaylistPrevious={onPlaylistPrevious}
          onPlaylistSeek={onPlaylistSeek}
        />
      </Paper>
    </Container>
  );
}
