import React, { useCallback, useEffect, useRef, useState } from "react";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import Stop from "@mui/icons-material/StopRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { validRepeatInterval } from "./repeatInterval";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import FormHelperText from "@mui/material/FormHelperText";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";

import { useDispatch } from "react-redux";
import { editSound, Sound } from "./soundboardsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { AudioEffectsControls } from "../../common/AudioEffectsControls";
import { SoundFadePreview } from "./SoundFadePreview";
import { settingsAccordionStyles } from "../../common/settingsAccordionStyles";

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

type SoundSettingsProps = {
  sound: Sound;
  open: boolean;
  onClose: () => void;
};

export function SoundSettings({ sound, open, onClose }: SoundSettingsProps) {
  const dispatch = useDispatch();
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [minimum, setMinimum] = useState("3");
  const [maximum, setMaximum] = useState("8");
  const [lowPassHz, setLowPassHz] = useState<number | null>(null);
  const [reverbMix, setReverbMix] = useState(0);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState<number>();
  const [preview, setPreview] = useState<"loading" | "playing" | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const previewRef = useRef<SoundFadePreview>();

  const stopPreview = useCallback(() => {
    previewRef.current?.stop();
    previewRef.current = undefined;
    setPreview(null);
  }, []);

  useEffect(() => {
    if (open) {
      setRepeatEnabled(Boolean(sound.repeatInterval));
      setMinimum(String(sound.repeatInterval?.minSeconds ?? 3));
      setMaximum(String(sound.repeatInterval?.maxSeconds ?? 8));
      setLowPassHz(sound.lowPassHz ?? null);
      setReverbMix(sound.reverbMix ?? 0);
      setStart(String(sound.startSeconds ?? 0));
      setEnd(sound.endSeconds == null ? "" : String(sound.endSeconds));
      setPreviewError(false);
    } else {
      stopPreview();
    }
  }, [open, sound.id, stopPreview]);

  useEffect(() => {
    setDuration(undefined);
    if (!open || !sound.url) return;
    const audio = document.createElement("audio");
    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        setDuration(audio.duration);
    };
    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", readDuration);
    audio.addEventListener("durationchange", readDuration);
    audio.src = sound.url;
    audio.load();
    return () => {
      audio.removeEventListener("loadedmetadata", readDuration);
      audio.removeEventListener("durationchange", readDuration);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [open, sound.url]);

  useEffect(() => () => previewRef.current?.stop(), []);
  const interval = { minSeconds: Number(minimum), maxSeconds: Number(maximum) };
  const intervalValid =
    !repeatEnabled ||
    (minimum !== "" && maximum !== "" && validRepeatInterval(interval));
  const numericStart = Number(start);
  const numericEnd = end === "" ? duration : Number(end);
  const trimValid =
    Number.isFinite(numericStart) &&
    numericStart >= 0 &&
    (!duration || numericStart < duration) &&
    (end === "" ||
      (Number.isFinite(numericEnd) &&
        numericEnd > numericStart &&
        (!duration || numericEnd <= duration + 0.05)));
  const valid = intervalValid && trimValid;
  const timelineStart = duration
    ? clamp(numericStart, 0, Math.max(0, duration - 0.1))
    : 0;
  const timelineEnd = duration
    ? clamp(numericEnd ?? duration, timelineStart + 0.1, duration)
    : 1;

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editSound({ id: sound.id, title: event.target.value }));
  }

  function handleTitleStringChange(title: string) {
    dispatch(editSound({ id: sound.id, title }));
  }

  function handleURLChange(url: string) {
    dispatch(editSound({ id: sound.id, url }));
  }

  function handleFadeInChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    dispatch(editSound({ id: sound.id, fadeIn: isNaN(num) ? 0 : num }));
  }

  function handleFadeOutChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    dispatch(editSound({ id: sound.id, fadeOut: isNaN(num) ? 0 : num }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    dispatch(
      editSound({
        id: sound.id,
        repeatInterval: repeatEnabled ? interval : null,
        startSeconds: numericStart,
        endSeconds: end === "" ? null : Number(end),
        lowPassHz,
        reverbMix,
      }),
    );
    stopPreview();
    onClose();
  }

  function startPreview() {
    stopPreview();
    setPreviewError(false);
    setPreview("loading");
    const instance = new SoundFadePreview({
      src: sound.url,
      volume: sound.volume,
      fadeInMilliseconds: sound.fadeIn,
      fadeOutMilliseconds: sound.fadeOut,
      startSeconds: trimValid ? numericStart : sound.startSeconds,
      endSeconds:
        trimValid && end !== "" ? Number(end) : (sound.endSeconds ?? null),
      lowPassHz,
      reverbMix,
      onPlaying: () => setPreview("playing"),
      onFinish: () => {
        if (previewRef.current === instance) {
          previewRef.current = undefined;
          setPreview(null);
        }
      },
      onError: () => {
        if (previewRef.current === instance) {
          previewRef.current = undefined;
          setPreview(null);
          setPreviewError(true);
        }
      },
    });
    previewRef.current = instance;
    instance.start();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopPreview();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
      // Stop key events from propagating to prevent the sound drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DialogTitle>Edit Sound</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector
            value={sound.url}
            onChange={handleURLChange}
            onFileName={handleTitleStringChange}
          />
          <TextField
            margin="dense"
            id="name"
            label="Name"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={sound.title}
            onChange={handleTitleChange}
          />
          <Accordion
            disableGutters
            elevation={0}
            defaultExpanded
            sx={(theme) => ({ ...settingsAccordionStyles(theme), mt: 2 })}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Timing &amp; fades</Typography>
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
                    error={!trimValid && numericStart >= (duration ?? Infinity)}
                    sx={{ width: { sm: 125 }, flexShrink: 0 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 180, px: 1 }}>
                    <Slider
                      min={0}
                      max={duration}
                      step={0.1}
                      disableSwap
                      value={[timelineStart, timelineEnd]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => clock(value)}
                      getAriaLabel={(index) =>
                        index === 0 ? "Sound start" : "Sound end"
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
                    error={
                      end !== "" &&
                      (Number(end) <= numericStart || Number(end) > duration)
                    }
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
                    error={!Number.isFinite(numericStart) || numericStart < 0}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="End (seconds)"
                    type="number"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    error={end !== "" && Number(end) <= numericStart}
                  />
                </Stack>
              )}
              <Button
                size="small"
                disabled={end === ""}
                onClick={() => setEnd("")}
                sx={{ mt: 1 }}
              >
                Use file end
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Continuous sounds loop between these points. Move the end before
                unwanted noise or silence without changing the source file.
              </Typography>
              <Box sx={{ display: "flex", gap: 1, my: 1 }}>
                <FormControl variant="standard" fullWidth>
                  <FormHelperText id="fade-in-helper-text">
                    Fade In
                  </FormHelperText>
                  <Input
                    margin="dense"
                    fullWidth
                    autoComplete="off"
                    id="fade-in"
                    value={`${sound.fadeIn}`}
                    onChange={handleFadeInChange}
                    endAdornment={
                      <InputAdornment position="end">ms</InputAdornment>
                    }
                    aria-describedby="fade-in-helper-text"
                    inputProps={{
                      "aria-label": "fade in",
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                    }}
                  />
                </FormControl>
                <FormControl variant="standard" fullWidth>
                  <FormHelperText id="fade-out-helper-text">
                    Fade Out
                  </FormHelperText>
                  <Input
                    margin="dense"
                    fullWidth
                    autoComplete="off"
                    id="fade-out"
                    value={`${sound.fadeOut}`}
                    onChange={handleFadeOutChange}
                    endAdornment={
                      <InputAdornment position="end">ms</InputAdornment>
                    }
                    aria-describedby="fade-out-helper-text"
                    inputProps={{
                      "aria-label": "fade out",
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                    }}
                  />
                </FormControl>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  disabled={preview === "loading" || !trimValid}
                  onClick={startPreview}
                >
                  Preview loop transition
                </Button>
                {preview && (
                  <Button
                    size="small"
                    startIcon={<Stop />}
                    onClick={stopPreview}
                  >
                    Stop
                  </Button>
                )}
              </Box>
              <Typography
                variant="caption"
                color={previewError ? "error" : "text.secondary"}
                display="block"
                sx={{ mb: 1 }}
              >
                {previewError
                  ? "Unable to preview this sound. Check its source and try again."
                  : preview === "loading"
                    ? "Loading preview…"
                    : preview === "playing"
                      ? "Previewing the end-to-beginning crossfade…"
                      : "Plays the end, crossfades into the beginning, then continues briefly."}
              </Typography>
            </AccordionDetails>
          </Accordion>
          <FormControlLabel
            control={
              <Switch
                checked={repeatEnabled}
                onChange={(_, checked) => setRepeatEnabled(checked)}
              />
            }
            label="Repeat at random intervals"
          />
          {repeatEnabled && (
            <>
              <Box sx={{ display: "flex", gap: 2, my: 1 }}>
                <TextField
                  label="Minimum wait (seconds)"
                  type="number"
                  value={minimum}
                  onChange={(event) => setMinimum(event.target.value)}
                  inputProps={{ min: 0.1, max: 86400, step: 0.1 }}
                  error={!intervalValid}
                />
                <TextField
                  label="Maximum wait (seconds)"
                  type="number"
                  value={maximum}
                  onChange={(event) => setMaximum(event.target.value)}
                  inputProps={{ min: 0.1, max: 86400, step: 0.1 }}
                  error={!intervalValid}
                />
              </Box>
              <Typography
                variant="caption"
                color={intervalValid ? "text.secondary" : "error"}
              >
                {intervalValid
                  ? "Waits after each sound finishes. Equal values give a fixed interval. Replaces continuous looping when saved."
                  : "Enter 0.1–86400 seconds, with maximum at least minimum."}
              </Typography>
            </>
          )}
          <AudioEffectsControls
            lowPassHz={lowPassHz}
            reverbMix={reverbMix}
            onLowPassChange={setLowPassHz}
            onReverbChange={setReverbMix}
          />
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
