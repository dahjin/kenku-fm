import React, { useState } from "react";
import LocalOffer from "@mui/icons-material/LocalOfferOutlined";
import { Box, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { editTrack, Track } from "./playlistsSlice";
import { TagInput } from "./TagInput";

export function QuickTagEditor({
  track,
  availableTags,
}: {
  track: Track;
  availableTags: string[];
}) {
  const dispatch = useDispatch();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tags = track.tags ?? [];
  return (
    <>
      <Tooltip title="Edit tags">
        <IconButton
          size="small"
          aria-label={`Edit tags for ${track.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setAnchor(event.currentTarget);
          }}
        >
          <LocalOffer fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box
          sx={{ p: 2, width: "min(420px, calc(100vw - 32px))" }}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Typography variant="subtitle2" noWrap title={track.title}>
            Tags for {track.title}
          </Typography>
          <TagInput
            label="Tags"
            helperText="Type or choose a tag; changes save immediately."
            value={tags}
            options={availableTags}
            onChange={(value) =>
              dispatch(editTrack({ id: track.id, tags: value }))
            }
          />
        </Box>
      </Popover>
    </>
  );
}
