import React, { useRef, useState } from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TrackItem } from "./TrackItem";
import { SortableItem } from "../../common/SortableItem";

import { useDispatch } from "react-redux";
import { Playlist, Track, moveTrack } from "./playlistsSlice";
import { moveQueueIfNeeded } from "./playlistPlaybackSlice";

import { useHideScrollbar } from "../../../renderer/common/useHideScrollbar";

type PlaylistTracksProps = {
  items: Track[];
  playlist: Playlist;
  onPlay: (id: string) => void;
};

export function PlaylistTracks({
  items,
  playlist,
  onPlay,
}: PlaylistTracksProps) {
  const dispatch = useDispatch();

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      dispatch(
        moveTrack({
          playlistId: playlist.id,
          active: active.id,
          over: over.id,
        }),
      );
      dispatch(
        moveQueueIfNeeded({
          playlistId: playlist.id,
          active: active.id,
          over: over.id,
        }),
      );
    }

    setDragId(null);
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const hideScrollbar = useHideScrollbar(scrollRef);

  return (
    <Box
      sx={{
        overflowY: "auto",
        maskImage:
          "linear-gradient(to bottom, black, black calc(100% - 64px), transparent)",
        position: "relative",
        width: "100%",
        flex: 1,
        minHeight: 0,
        px: 2,
      }}
      ref={scrollRef}
      {...hideScrollbar}
    >
      <List
        sx={{
          width: "100%",
          minWidth: 360,
          maxWidth: 720,
          margin: "0 auto",
          marginBottom: "240px",
        }}
      >
        {items.length === 0 && (
          <Typography role="status" textAlign="center" sx={{ p: 3 }}>
            {playlist.tracks.length
              ? "No tracks match these tags. Clear the filter to show all tracks."
              : "Add tracks to get started."}
          </Typography>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id}>
                <TrackItem track={item} playlist={playlist} onPlay={onPlay} />
              </SortableItem>
            ))}
            <DragOverlay>
              {dragId ? (
                <TrackItem
                  track={items.find((track) => track.id === dragId)}
                  playlist={playlist}
                  onPlay={onPlay}
                />
              ) : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
      </List>
    </Box>
  );
}
