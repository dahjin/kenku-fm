import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Search from "@mui/icons-material/SearchRounded";
import Check from "@mui/icons-material/CheckCircleRounded";
import Add from "@mui/icons-material/AddCircleOutlineRounded";

export function SceneVolume({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{ minWidth: 160 }}
    >
      <Slider
        size="small"
        aria-label={`${name} volume`}
        value={Math.round(value * 100)}
        min={0}
        max={100}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}%`}
        onChange={(_, v) => onChange((v as number) / 100)}
      />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          width: 42,
          flexShrink: 0,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(value * 100)}%
      </Typography>
    </Stack>
  );
}

export function LayerPicker({
  kind,
  items,
  selected,
  onToggle,
  onClose,
}: {
  kind: "sounds" | "groups";
  items: { id: string; title: string; detail: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    `${item.title} ${item.detail}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Add {kind === "sounds" ? "ambience" : "random groups"}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder={`Search ${kind} or soundboards`}
          inputProps={{ "aria-label": `Search ${kind}` }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 1, mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary">
          {kind === "sounds"
            ? "Choose sounds to loop in this tab."
            : "Choose groups to play one random sound at a time."}{" "}
          Changes take effect when you activate the tab.
        </Typography>
        <List sx={{ height: "min(45vh, 360px)", overflowY: "auto", mt: 1 }}>
          {filtered.map((item) => {
            const added = selected.includes(item.id);
            return (
              <ListItemButton
                key={item.id}
                role="checkbox"
                aria-checked={added}
                aria-label={item.title}
                selected={added}
                onClick={() => onToggle(item.id)}
                sx={{ mx: 0, gap: 2 }}
              >
                {added ? <Check color="primary" /> : <Add color="action" />}
                <ListItemText
                  primary={item.title}
                  secondary={item.detail}
                  primaryTypographyProps={{ noWrap: true }}
                />
                {added && <Chip size="small" label="Added" />}
              </ListItemButton>
            );
          })}
          {!filtered.length && (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography color="text.secondary">
                {items.length
                  ? "No matches. Try a sound or soundboard name."
                  : `No ${kind} yet. Add them in a soundboard first.`}
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {selected.length} selected
        </Typography>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
