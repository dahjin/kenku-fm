import React, { useRef, useState } from "react";

import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";

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
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import { SoundItem } from "./SoundItem";
import { SortableItem } from "../../common/SortableItem";

import { useDispatch } from "react-redux";
import { Soundboard, Sound, moveSound } from "./soundboardsSlice";

import { useHideScrollbar } from "../../../renderer/common/useHideScrollbar";

type SoundboardSoundsProps = {
  soundboard: Soundboard;
  onPlay: (sound: Sound) => void;
  onStop: (id: string) => void;
};

export function SoundboardSounds({
  soundboard,
  onPlay,
  onStop,
}: SoundboardSoundsProps) {
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
        moveSound({
          soundboardId: soundboard.id,
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
        pt: 1,
        px: 2,
      }}
      ref={scrollRef}
      {...hideScrollbar}
    >
      <Grid
        sx={{
          width: "100%",
          margin: "0 auto",
          marginBottom: "240px",
        }}
        container
        spacing={2}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={soundboard.sounds}
            strategy={rectSortingStrategy}
          >
            {soundboard.sounds.map((id) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={id}>
                <SortableItem key={id} id={id}>
                  <SoundItem
                    id={id}
                    soundboard={soundboard}
                    onPlay={onPlay}
                    onStop={onStop}
                  />
                </SortableItem>
              </Grid>
            ))}
            <DragOverlay>
              {dragId ? (
                <SoundItem
                  id={dragId}
                  soundboard={soundboard}
                  onPlay={onPlay}
                  onStop={onStop}
                />
              ) : null}
            </DragOverlay>
          </SortableContext>
        </DndContext>
      </Grid>
    </Box>
  );
}
