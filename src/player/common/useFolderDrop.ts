import { useState } from "react";
import { readAudioDrop, Directories } from "./audioDrop";
export type { AudioFile, Directory, Directories } from "./audioDrop";

export function useFolderDrop(onDrop: (directories: Directories) => void) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isFileDrag(data: DataTransfer) {
    const types = Array.from(data.types);
    return types.includes("Files") || types.includes("text/uri-list");
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    try {
      const result = await readAudioDrop(event.dataTransfer, (file) =>
        window.player.getPathForFile(file),
      );
      onDrop(result.directories);
      setError(result.errors.join(" ") || null);
    } catch {
      setError(
        "Could not import the dropped files. Try selecting them with Add.",
      );
    } finally {
      setDragging(false);
    }
  }

  const containerListeners = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };
  const overlayListeners = {
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return {
    dragging,
    containerListeners,
    overlayListeners,
    error,
    clearError: () => setError(null),
  };
}
