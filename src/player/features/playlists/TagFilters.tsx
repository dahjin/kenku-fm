import React from "react";
import { Box, Chip } from "@mui/material";
import type { Playlist, Track } from "./playlistsSlice";
import { getTagFacets, normalizeTags } from "./playlistTags";

export function TagFilters({
  playlist,
  tracks,
  selection = playlist.tagFilter ?? [],
  onChange,
}: {
  playlist: Playlist;
  tracks: Record<string, Track>;
  selection?: string[];
  onChange: (tags: string[]) => void;
}) {
  const selected = normalizeTags(selection);
  const total = playlist.tracks.filter((id) => tracks[id]).length;
  return (
    <Box
      role="group"
      aria-label={`${playlist.title} tag filters`}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.75,
        maxHeight: 144,
        overflowY: "auto",
        py: 0.5,
      }}
    >
      <Chip
        size="small"
        label={`All tracks (${total})`}
        aria-pressed={!selected.length}
        color={!selected.length ? "primary" : "default"}
        variant={!selected.length ? "filled" : "outlined"}
        onClick={() => onChange([])}
      />
      {getTagFacets(playlist, tracks, selected).map(
        ({ tag, count, selected: checked }) => (
          <Chip
            key={tag}
            size="small"
            label={`#${tag} (${count})`}
            aria-pressed={checked}
            color={checked ? "primary" : "default"}
            variant={checked ? "filled" : "outlined"}
            onClick={() =>
              onChange(
                checked
                  ? selected.filter((value) => value !== tag)
                  : [...selected, tag],
              )
            }
          />
        ),
      )}
    </Box>
  );
}
