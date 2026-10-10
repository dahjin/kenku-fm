import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  MenuItem,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { editTrack, Track } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { TagInput } from "./TagInput";

type TrackSettingsProps = {
  track: Track;
  availableTags: string[];
  open: boolean;
  onClose: () => void;
};

export function TrackSettings({
  track,
  availableTags,
  open,
  onClose,
}: TrackSettingsProps) {
  const dispatch = useDispatch();
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("");
  const [fade, setFade] = useState("");
  const position = useSelector((state: RootState) =>
    state.playlistPlayback.track?.id === track.id
      ? state.playlistPlayback.playback?.progress
      : undefined,
  );
  useEffect(() => {
    if (open) {
      setStart(String(track.startSeconds ?? 0));
      setEnd(track.endSeconds == null ? "" : String(track.endSeconds));
      setFade(
        track.crossfadeSeconds == null ? "" : String(track.crossfadeSeconds),
      );
    }
  }, [open, track.id]);
  const valid =
    Number.isFinite(Number(start)) &&
    Number(start) >= 0 &&
    (end === "" ||
      (Number.isFinite(Number(end)) && Number(end) > Number(start))) &&
    (fade === "" ||
      (Number.isFinite(Number(fade)) &&
        Number(fade) >= 0 &&
        Number(fade) <= 30));

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editTrack({ id: track.id, title: event.target.value }));
  }

  function handleTitleStringChange(title: string) {
    dispatch(editTrack({ id: track.id, title }));
  }

  function handleURLChange(url: string) {
    dispatch(editTrack({ id: track.id, url }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    dispatch(
      editTrack({
        id: track.id,
        startSeconds: Number(start),
        endSeconds: end === "" ? null : Number(end),
        crossfadeSeconds: fade === "" ? null : Number(fade),
      }),
    );
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Stop key events from propagating to prevent the track drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DialogTitle>Edit Track</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector
            value={track.url}
            onChange={handleURLChange}
            onFileName={handleTitleStringChange}
          />
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
            value={track.title}
            onChange={handleTitleChange}
          />
          <TagInput
            label="Tags"
            helperText="Type a tag and press Enter. You can also paste #creep #tavern."
            value={track.tags ?? []}
            options={availableTags}
            onChange={(tags) => dispatch(editTrack({ id: track.id, tags }))}
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Smart Shuffle frequency"
            value={track.frequency ?? 1}
            helperText="Relative odds when this playlist uses Smart Shuffle."
            onChange={(e) =>
              dispatch(
                editTrack({ id: track.id, frequency: Number(e.target.value) }),
              )
            }
          >
            <MenuItem value={0.25}>Rare · ¼×</MenuItem>
            <MenuItem value={1}>Normal · 1×</MenuItem>
            <MenuItem value={4}>Frequent · 4×</MenuItem>
          </TextField>
          <Accordion disableGutters elevation={0} sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Timing &amp; crossfade</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                margin="dense"
                label="Start at (seconds)"
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
                helperText="Skip the intro. Markers apply the next time this track plays."
              />
              <Button
                disabled={position === undefined}
                onClick={() => setStart(String(position))}
              >
                Use current position as start
              </Button>
              <TextField
                fullWidth
                margin="dense"
                label="End at (seconds)"
                type="number"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
                error={end !== "" && Number(end) <= Number(start)}
                helperText="Leave blank for the file end. Crossfade starts before this marker."
              />
              <Button
                disabled={position === undefined}
                onClick={() => setEnd(String(position))}
              >
                Use current position as end
              </Button>
              <TextField
                fullWidth
                margin="dense"
                label="Crossfade to next track (seconds)"
                type="number"
                value={fade}
                onChange={(e) => setFade(e.target.value)}
                inputProps={{ min: 0, max: 30, step: 0.1 }}
                helperText="Blank uses the playlist setting; 0 disables overlap for tracks with a baked-in fade."
              />
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button type="submit" disabled={!valid}>
            Done
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
