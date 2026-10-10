import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps,
  useNavigate,
} from "react-router-dom";

import AddIcon from "@mui/icons-material/AddCircleRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import useTheme from "@mui/material/styles/useTheme";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import { SceneItem } from "../scenes/SceneItem";
import { SceneAdd } from "../scenes/SceneAdd";
import { RootState } from "../../app/store";
import { PlaylistAdd } from "../playlists/PlaylistAdd";
import { PlaylistItem } from "../playlists/PlaylistItem";
import { Track } from "../playlists/playlistsSlice";
import { SoundboardAdd } from "../soundboards/SoundboardAdd";
import { SoundboardItem } from "../soundboards/SoundboardItem";
import { Sound } from "../soundboards/soundboardsSlice";

const PlaylistsLink = React.forwardRef<
  HTMLAnchorElement,
  Omit<RouterLinkProps, "to">
>((props, ref) => <RouterLink ref={ref} to="/playlists" {...props} />);

const SoundboardsLink = React.forwardRef<
  HTMLAnchorElement,
  Omit<RouterLinkProps, "to">
>((props, ref) => <RouterLink ref={ref} to="/soundboards" {...props} />);

type HomeProps = {
  onPlayTrack: (track: Track) => void;
  onPlaySound: (sound: Sound) => void;
  onStopSound: (id: string) => void;
};

export function Home({ onPlayTrack, onPlaySound, onStopSound }: HomeProps) {
  const navigate = useNavigate();
  const scenes = useSelector((state: RootState) => state.scenes);
  const playlists = useSelector((state: RootState) => state.playlists);
  const soundboards = useSelector((state: RootState) => state.soundboards);

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("lg"));

  const playlistItems = playlists.playlists.allIds
    .slice(0, isSmall ? 4 : 6)
    .map((id) => playlists.playlists.byId[id]);
  const soundboardItems = soundboards.soundboards.allIds
    .slice(0, isSmall ? 4 : 6)
    .map((id) => soundboards.soundboards.byId[id]);

  const sceneItems = scenes.allIds
    .slice(0, isSmall ? 4 : 6)
    .map((id) => scenes.byId[id]);
  const [sceneAddOpen, setSceneAddOpen] = useState(false);
  const [playlistAddOpen, setPlaylistAddOpen] = useState(false);
  const [soundboardAddOpen, setSoundboardAddOpen] = useState(false);

  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mt: 4,
        mb: "248px",
      }}
    >
      <Box>
        <Typography variant="h4" component="h1">
          Library
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Activate a scene, choose music by tags, or play a sound.
        </Typography>
      </Box>
      <Card>
        <CardContent>
          <Stack gap={1} alignItems="center" direction="row">
            <Typography variant="h5" component="div">
              Scenes
            </Typography>
            <Tooltip title="Add Scene">
              <IconButton
                aria-label="Add Scene"
                onClick={() => setSceneAddOpen(true)}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Link
              component={RouterLink}
              to="/scenes"
              color="inherit"
              underline="hover"
            >
              See All
            </Link>
          </Stack>
        </CardContent>
        <CardContent>
          {sceneItems.length ? (
            <Grid container spacing={2}>
              {sceneItems.map((scene) => (
                <Grid xs={12} sm={6} md={4} item key={scene.id}>
                  <SceneItem
                    scene={scene}
                    onSelect={(id) =>
                      navigate(`/scenes?scene=${encodeURIComponent(id)}`)
                    }
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">
              Create a scene with Day, Night and Tension tabs, then activate
              them here.
            </Typography>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack
            gap={1}
            justifyContent="space-between"
            alignItems="center"
            direction="row"
          >
            <Typography variant="h5" component="div">
              Playlists
            </Typography>
            <Tooltip title="Add Playlist">
              <IconButton
                aria-label="Add playlist"
                onClick={() => setPlaylistAddOpen(true)}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Link color="inherit" underline="hover" component={PlaylistsLink}>
              See All
            </Link>
          </Stack>
        </CardContent>
        <CardContent>
          <Grid container spacing={2}>
            {!playlistItems.length && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Your music lives here. Add a playlist, then tag its tracks to
                  build a mix.
                </Typography>
              </Grid>
            )}
            {playlistItems.map((playlist) => (
              <Grid xs={12} sm={6} md={4} item key={playlist.id}>
                <PlaylistItem
                  quickControls
                  playlist={playlist}
                  onSelect={(id) => navigate(`/playlists/${id}`)}
                  onPlay={onPlayTrack}
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Stack
            gap={1}
            justifyContent="space-between"
            alignItems="center"
            direction="row"
          >
            <Typography variant="h5" component="div">
              Soundboards
            </Typography>
            <Tooltip title="Add Soundboard">
              <IconButton
                aria-label="Add soundboard"
                onClick={() => setSoundboardAddOpen(true)}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            <Link color="inherit" underline="hover" component={SoundboardsLink}>
              See All
            </Link>
          </Stack>
        </CardContent>
        <CardContent>
          <Grid container spacing={2}>
            {!soundboardItems.length && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Add a soundboard for ambience, one-shot effects and random
                  sound groups.
                </Typography>
              </Grid>
            )}
            {soundboardItems.map((soundboard) => (
              <Grid xs={12} sm={6} md={4} item key={soundboard.id}>
                <SoundboardItem
                  quickControls
                  onStop={onStopSound}
                  soundboard={soundboard}
                  onSelect={(id) => navigate(`/soundboards/${id}`)}
                  onPlay={onPlaySound}
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
      {sceneAddOpen && <SceneAdd onClose={() => setSceneAddOpen(false)} />}
      <PlaylistAdd
        open={playlistAddOpen}
        onClose={() => setPlaylistAddOpen(false)}
      />
      <SoundboardAdd
        open={soundboardAddOpen}
        onClose={() => setSoundboardAddOpen(false)}
      />
    </Container>
  );
}
