import React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import { RootState } from "../../app/store";
import { getPlaylistTags } from "./playlistTags";
import { useDispatch, useSelector } from "react-redux";
import { editPlaylist, Playlist } from "./playlistsSlice";
import { ImageSelector } from "../../common/ImageSelector";

type PlaylistSettingsProps = {
  playlist: Playlist;
  open: boolean;
  onClose: () => void;
};

export function PlaylistSettings({
  playlist,
  open,
  onClose,
}: PlaylistSettingsProps) {
  const dispatch = useDispatch();
  const tracks = useSelector((state: RootState) => state.playlists.tracks);
  const tags = getPlaylistTags(playlist, tracks);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editPlaylist({ id: playlist.id, title: event.target.value }));
  }

  function handleBackgroundChange(background: string) {
    dispatch(editPlaylist({ id: playlist.id, background }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            margin="dense"
            id="name"
            label="Name"
            fullWidth
            variant="outlined"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={playlist.title}
            onChange={handleTitleChange}
          />
          <TextField
            label="Crossfade (seconds)"
            type="number"
            fullWidth
            margin="dense"
            value={playlist.crossfadeSeconds ?? 0}
            inputProps={{ min: 0, max: 30, step: 0.5 }}
            helperText="0 turns crossfading off. Short tracks use a shorter fade."
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value))
                dispatch(
                  editPlaylist({
                    id: playlist.id,
                    crossfadeSeconds: Math.min(30, Math.max(0, value)),
                  }),
                );
            }}
          />
          <Box
            sx={{
              my: 2,
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <FormControlLabel
              label="Smart Shuffle"
              control={
                <Switch
                  checked={playlist.smartShuffle ?? false}
                  onChange={(_, smartShuffle) =>
                    dispatch(editPlaylist({ id: playlist.id, smartShuffle }))
                  }
                />
              }
            />
            <Typography variant="body2" color="text.secondary">
              A varied mix with control over what plays more often.
            </Typography>
            {playlist.smartShuffle && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Alert severity="info">
                  Used with Shuffle and Repeat playlist enabled. Ordered
                  playback, Repeat track and Repeat off keep their usual
                  behavior.
                </Alert>
                <TextField
                  label="Avoid the last N tracks"
                  type="number"
                  value={playlist.avoidRecent ?? 3}
                  inputProps={{ min: 0, max: 100, step: 1 }}
                  helperText="0 allows repeats. Small filtered lists relax the oldest exclusions first. History lasts until the app closes."
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isFinite(value))
                      dispatch(
                        editPlaylist({
                          id: playlist.id,
                          avoidRecent: Math.max(
                            0,
                            Math.min(100, Math.floor(value)),
                          ),
                        }),
                      );
                  }}
                />
                <Typography variant="subtitle2">Tag priorities</Typography>
                <Typography variant="caption" color="text.secondary">
                  Priority raises selection odds within your tag filter. If
                  several tags match, the strongest priority wins.
                </Typography>
                {tags.length ? (
                  <Box sx={{ maxHeight: 240, overflowY: "auto", py: 0.5 }}>
                    <Stack spacing={1}>
                      {tags.map((tag) => (
                        <Stack
                          key={tag}
                          direction="row"
                          spacing={2}
                          alignItems="center"
                        >
                          <Typography
                            sx={{ flex: 1, overflowWrap: "anywhere" }}
                          >
                            #{tag}
                          </Typography>
                          <TextField
                            select
                            size="small"
                            inputProps={{
                              "aria-label": `Priority for #${tag}`,
                            }}
                            value={playlist.tagPriorities?.[tag] ?? 1}
                            sx={{ width: 160, flexShrink: 0 }}
                            onChange={(e) =>
                              dispatch(
                                editPlaylist({
                                  id: playlist.id,
                                  tagPriorities: {
                                    ...playlist.tagPriorities,
                                    [tag]: Number(e.target.value),
                                  },
                                }),
                              )
                            }
                          >
                            <MenuItem value={1}>Normal · 1×</MenuItem>
                            <MenuItem value={2}>Prefer · 2×</MenuItem>
                            <MenuItem value={4}>Strong · 4×</MenuItem>
                          </TextField>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Add tags to tracks to set priorities here.
                  </Typography>
                )}
              </Stack>
            )}
          </Box>
          <Accordion disableGutters elevation={0}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Artwork</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ImageSelector
                value={playlist.background}
                onChange={handleBackgroundChange}
              />
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
