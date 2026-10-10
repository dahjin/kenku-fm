import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";

import { editTrack, Track } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { TagInput } from "./TagInput";

type TrackSettingsProps = {
  track: Track;
  availableTags: string[];
  open: boolean;
  onClose: () => void;
};

function roundSeconds(value: number) {
  return String(Math.round(value * 10) / 10);
}

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.max(0, seconds - minutes * 60);
  return `${minutes}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

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
  const [duration, setDuration] = useState<number>();
  const playlistFade = useSelector((state: RootState) => {
    const playlist = state.playlists.playlists.allIds
      .map((id) => state.playlists.playlists.byId[id])
      .find((item) => item.tracks.includes(track.id));
    return playlist?.crossfadeSeconds ?? 0;
  });
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
  useEffect(() => {
    setDuration(undefined);
    if (!open || !track.url) return;
    const audio = document.createElement("audio");
    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        setDuration(audio.duration);
    };
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("durationchange", readDuration);
    audio.src = track.url;
    audio.load();
    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("durationchange", readDuration);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [open, track.url]);

  const numericStart = Number.isFinite(Number(start)) ? Number(start) : 0;
  const numericEnd =
    end !== "" && Number.isFinite(Number(end)) ? Number(end) : duration;
  const timelineStart = duration
    ? clamp(numericStart, 0, Math.max(0, duration - 0.1))
    : 0;
  const timelineEnd = duration
    ? clamp(numericEnd ?? duration, timelineStart + 0.1, duration)
    : 1;
  const fadeValue = clamp(
    fade === "" || !Number.isFinite(Number(fade)) ? playlistFade : Number(fade),
    0,
    30,
  );
  const visibleFade = duration
    ? Math.min(fadeValue, (timelineEnd - timelineStart) / 2)
    : 0;
  const fadeLeft = duration
    ? ((timelineEnd - visibleFade) / duration) * 100
    : 0;
  const fadeWidth = duration ? (visibleFade / duration) * 100 : 0;
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
              <Typography variant="subtitle2" gutterBottom>
                Playable range
              </Typography>
              {duration ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    size="small"
                    label="Start"
                    type="number"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">s</InputAdornment>
                      ),
                    }}
                    sx={{ width: { sm: 125 }, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Box sx={{ position: "relative", px: 1 }}>
                      <Slider
                        min={0}
                        max={duration}
                        step={0.1}
                        disableSwap
                        value={[timelineStart, timelineEnd]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${clock(value)}`}
                        getAriaLabel={(index) =>
                          index === 0 ? "Track start" : "Track end"
                        }
                        onChange={(_event, value, activeThumb) => {
                          const [nextStart, nextEnd] = value as number[];
                          if (activeThumb === 0)
                            setStart(
                              roundSeconds(
                                Math.min(nextStart, timelineEnd - 0.1),
                              ),
                            );
                          else
                            setEnd(
                              nextEnd >= duration - 0.05
                                ? ""
                                : roundSeconds(
                                    Math.max(nextEnd, timelineStart + 0.1),
                                  ),
                            );
                        }}
                      />
                      {visibleFade > 0 && (
                        <Box
                          aria-hidden
                          sx={{
                            position: "absolute",
                            pointerEvents: "none",
                            zIndex: 1,
                            top: "50%",
                            left: `${fadeLeft}%`,
                            width: `${fadeWidth}%`,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: "secondary.main",
                            opacity: 0.8,
                            transform: "translateY(-50%)",
                          }}
                        />
                      )}
                      {position !== undefined && (
                        <Box
                          aria-label={`Current position ${clock(position)}`}
                          sx={{
                            position: "absolute",
                            pointerEvents: "none",
                            zIndex: 2,
                            top: 5,
                            bottom: 5,
                            left: `calc(${(clamp(position, 0, duration) / duration) * 100}% + 8px)`,
                            width: 2,
                            bgcolor: "text.primary",
                          }}
                        />
                      )}
                    </Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        0:00.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {clock(duration)}
                      </Typography>
                    </Stack>
                  </Box>
                  <TextField
                    size="small"
                    label="End"
                    type="number"
                    value={end}
                    placeholder={roundSeconds(duration)}
                    onChange={(event) => setEnd(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">s</InputAdornment>
                      ),
                    }}
                    error={end !== "" && Number(end) <= Number(start)}
                    sx={{ width: { sm: 125 }, flexShrink: 0 }}
                  />
                </Stack>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Start (seconds)"
                    type="number"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="End (seconds)"
                    type="number"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    error={end !== "" && Number(end) <= Number(start)}
                  />
                </Stack>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                sx={{ mt: 1 }}
              >
                <Button
                  size="small"
                  disabled={position === undefined}
                  onClick={() => setStart(roundSeconds(position ?? 0))}
                >
                  Set start from playhead
                </Button>
                <Button
                  size="small"
                  disabled={position === undefined}
                  onClick={() => setEnd(roundSeconds(position ?? 0))}
                >
                  Set end from playhead
                </Button>
                <Button
                  size="small"
                  disabled={end === ""}
                  onClick={() => setEnd("")}
                >
                  Use file end
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Drag either handle for quick trimming, then use the side fields
                for 0.1-second adjustments. The dark marker is the playhead and
                the colored tail is the outgoing crossfade.
              </Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">
                Crossfade to next track
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Slider
                  min={0}
                  max={30}
                  step={0.1}
                  value={fadeValue}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(1)} s`}
                  aria-label="Crossfade duration"
                  onChange={(_event, value) =>
                    setFade(roundSeconds(value as number))
                  }
                />
                <TextField
                  size="small"
                  label="Seconds"
                  type="number"
                  value={fade}
                  placeholder={roundSeconds(playlistFade)}
                  onChange={(event) => setFade(event.target.value)}
                  inputProps={{ min: 0, max: 30, step: 0.1 }}
                  error={
                    fade !== "" &&
                    (!Number.isFinite(Number(fade)) ||
                      Number(fade) < 0 ||
                      Number(fade) > 30)
                  }
                  sx={{ width: 120, flexShrink: 0 }}
                />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                  size="small"
                  disabled={fade === ""}
                  onClick={() => setFade("")}
                >
                  Use playlist setting
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {fade === ""
                    ? `Using playlist setting: ${roundSeconds(playlistFade)} seconds`
                    : Number(fade) === 0
                      ? "Crossfade disabled for this track"
                      : "Per-track override"}
                </Typography>
              </Stack>
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
