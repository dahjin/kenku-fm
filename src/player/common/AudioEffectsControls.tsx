import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import {
  DEFAULT_LOW_PASS_HZ,
  MAX_LOW_PASS_HZ,
  MIN_LOW_PASS_HZ,
} from "./audioEffects";
import { settingsAccordionStyles } from "./settingsAccordionStyles";

type Props = {
  lowPassHz: number | null;
  reverbMix: number;
  onLowPassChange: (value: number | null) => void;
  onReverbChange: (value: number) => void;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function frequencyToPosition(frequency: number) {
  return (
    (Math.log(frequency / MIN_LOW_PASS_HZ) /
      Math.log(MAX_LOW_PASS_HZ / MIN_LOW_PASS_HZ)) *
    100
  );
}

function positionToFrequency(position: number) {
  const frequency =
    MIN_LOW_PASS_HZ *
    Math.pow(MAX_LOW_PASS_HZ / MIN_LOW_PASS_HZ, position / 100);
  return Math.round(frequency / 10) * 10;
}

export function AudioEffectsControls({
  lowPassHz,
  reverbMix,
  onLowPassChange,
  onReverbChange,
}: Props) {
  const frequency = clamp(
    lowPassHz ?? DEFAULT_LOW_PASS_HZ,
    MIN_LOW_PASS_HZ,
    MAX_LOW_PASS_HZ,
  );
  const reverbPercent = Math.round(clamp(reverbMix, 0, 1) * 100);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={(theme) => ({ ...settingsAccordionStyles(theme), mt: 1 })}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>Audio filters</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={lowPassHz !== null}
              onChange={(_, enabled) =>
                onLowPassChange(enabled ? frequency : null)
              }
            />
          }
          label="Low-pass filter"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          Softens bright frequencies for sounds heard through walls, underwater,
          or at a distance.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Slider
            min={0}
            max={100}
            step={1}
            disabled={lowPassHz === null}
            value={frequencyToPosition(frequency)}
            valueLabelDisplay="auto"
            valueLabelFormat={() => `${frequency} Hz`}
            aria-label="Low-pass cutoff"
            onChange={(_event, value) =>
              onLowPassChange(positionToFrequency(value as number))
            }
          />
          <TextField
            size="small"
            label="Cutoff"
            type="number"
            disabled={lowPassHz === null}
            value={frequency}
            onChange={(event) =>
              onLowPassChange(
                clamp(
                  Number(event.target.value) || MIN_LOW_PASS_HZ,
                  MIN_LOW_PASS_HZ,
                  MAX_LOW_PASS_HZ,
                ),
              )
            }
            inputProps={{ min: MIN_LOW_PASS_HZ, max: MAX_LOW_PASS_HZ, step: 10 }}
            InputProps={{ endAdornment: <Typography>Hz</Typography> }}
            sx={{ width: 140, flexShrink: 0 }}
          />
        </Stack>

        <Typography sx={{ mt: 2 }}>Reverb</Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Adds a medium room tail. Zero keeps the effect off.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Slider
            min={0}
            max={100}
            step={1}
            value={reverbPercent}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
            aria-label="Reverb mix"
            onChange={(_event, value) =>
              onReverbChange((value as number) / 100)
            }
          />
          <TextField
            size="small"
            label="Mix"
            type="number"
            value={reverbPercent}
            onChange={(event) =>
              onReverbChange(clamp(Number(event.target.value) || 0, 0, 100) / 100)
            }
            inputProps={{ min: 0, max: 100, step: 1 }}
            InputProps={{ endAdornment: <Typography>%</Typography> }}
            sx={{ width: 120, flexShrink: 0 }}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
