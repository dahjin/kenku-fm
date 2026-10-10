import React, { useRef } from "react";
import { Box, IconButton, ButtonBase, Tooltip } from "@mui/material";
import Drag from "@mui/icons-material/DragIndicatorRounded";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SceneTab } from "./scenesSlice";

function SortableTab({
  tab,
  selected,
  live,
  onSelect,
  onNavigate,
}: {
  tab: SceneTab;
  selected: boolean;
  live: boolean;
  onSelect: () => void;
  onNavigate: (event: React.KeyboardEvent) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });
  return (
    <Box
      ref={setNodeRef}
      role="presentation"
      sx={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        borderBottom: 2,
        borderColor: selected ? "primary.main" : "transparent",
        bgcolor: isDragging ? "background.paper" : "transparent",
        position: "relative",
        zIndex: isDragging ? 1 : 0,
        opacity: isDragging ? 0.8 : 1,
        "&:hover .scene-drag-handle, &:focus-within .scene-drag-handle": {
          opacity: 1,
        },
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <Tooltip title="Drag to reorder. Keyboard: Space, arrow keys, Space.">
        <IconButton
          className="scene-drag-handle"
          size="small"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${tab.title || "Untitled tab"}`}
          sx={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            color: "text.secondary",
            p: 0.5,
            opacity: isDragging ? 1 : 0.18,
            transition: "opacity 150ms ease",
            "@media (hover: none)": { opacity: 0.65 },
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        >
          <Drag fontSize="small" />
        </IconButton>
      </Tooltip>
      <ButtonBase
        role="tab"
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        onClick={onSelect}
        onKeyDown={onNavigate}
        sx={{
          minWidth: 72,
          minHeight: 48,
          px: 1.5,
          typography: "button",
          textTransform: "uppercase",
          color: selected ? "primary.main" : "text.secondary",
          "&.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
        }}
      >
        <Box
          component="span"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          {tab.title || "Untitled tab"}
          {live && (
            <Box
              component="span"
              aria-label="Live"
              sx={{
                width: 6,
                height: 6,
                bgcolor: "success.main",
                borderRadius: "50%",
              }}
            />
          )}
        </Box>
      </ButtonBase>
    </Box>
  );
}

export function SceneTabs({
  tabs,
  selected,
  live,
  onSelect,
  onReorder,
}: {
  tabs: SceneTab[];
  selected?: string;
  live?: string;
  onSelect: (id: string) => void;
  onReorder: (active: string, over: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function navigate(event: React.KeyboardEvent, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onSelect(tabs[next].id);
    root.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onReorder(active.id, over.id);
      }}
    >
      <SortableContext
        items={tabs.map((tab) => tab.id)}
        strategy={horizontalListSortingStrategy}
      >
        <Box
          ref={root}
          role="tablist"
          aria-label="Scene tabs"
          sx={{
            display: "flex",
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            scrollbarWidth: "thin",
          }}
        >
          {tabs.map((tab, index) => (
            <SortableTab
              key={tab.id}
              tab={tab}
              selected={tab.id === selected}
              live={tab.id === live}
              onSelect={() => onSelect(tab.id)}
              onNavigate={(event) => navigate(event, index)}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
}
