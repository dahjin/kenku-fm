import React, { useCallback, useEffect, useRef, useState } from "react";
import PlayArrow from "@mui/icons-material/PlayArrowRounded";
import Stop from "@mui/icons-material/StopRounded";
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

import { useDispatch } from "react-redux";
import { editSound, Sound } from "./soundboardsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { AudioEffectsControls } from "../../common/AudioEffectsControls";
import { SoundFadePreview } from "./SoundFadePreview";

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
      setPreviewError(false);
    } else {
      stopPreview();
    }
  }, [open, sound.id, stopPreview]);

  useEffect(() => () => previewRef.current?.stop(), []);
  const interval = { minSeconds: Number(minimum), maxSeconds: Number(maximum) };
  const valid =
    !repeatEnabled ||
    (minimum !== "" && maximum !== "" && validRepeatInterval(interval));

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
          <Box sx={{ display: "flex", gap: 1, my: 1 }}>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-in-helper-text">Fade In</FormHelperText>
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
              disabled={preview === "loading"}
              onClick={startPreview}
            >
              Preview loop transition
            </Button>
            {preview && (
              <Button size="small" startIcon={<Stop />} onClick={stopPreview}>
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
                  error={!valid}
                />
                <TextField
                  label="Maximum wait (seconds)"
                  type="number"
                  value={maximum}
                  onChange={(event) => setMaximum(event.target.value)}
                  inputProps={{ min: 0.1, max: 86400, step: 0.1 }}
                  error={!valid}
                />
              </Box>
              <Typography
                variant="caption"
                color={valid ? "text.secondary" : "error"}
              >
                {valid
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
