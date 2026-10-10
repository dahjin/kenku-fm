import React, { useCallback, useRef, useState } from "react";
import { acceptsFile } from "./acceptedFile";
import { filePathsFromUriList } from "./audioDrop";

export type FileInfo = { path: string; name: string };

/** Read every drop format synchronously while Chromium still owns the native
 * drag payload. This keeps upstream's FileList behavior and adds Dolphin's
 * URI-list fallback without awaiting an invalidated React drag event.
 */
export function readFileDrop(
  data: DataTransfer,
  getPath: (file: File) => string,
  accept: string,
  multiple: boolean,
): FileInfo[] {
  const files: FileInfo[] = [];
  const seen = new Set<string>();
  const maximum = multiple ? Number.POSITIVE_INFINITY : 1;

  function add(path: string, name: string, type = "") {
    if (
      files.length >= maximum ||
      !path ||
      seen.has(path) ||
      !acceptsFile(accept, type, name)
    )
      return;
    seen.add(path);
    files.push({ path, name });
  }

  for (const file of Array.from(data.files)) {
    try {
      add(getPath(file), file.name, file.type);
    } catch {
      // Dolphin's URI-list can still supply the local path.
    }
  }
  for (const type of ["text/uri-list", "text/plain"]) {
    try {
      for (const path of filePathsFromUriList(data.getData(type)))
        add(path, path.slice(path.lastIndexOf("/") + 1));
    } catch {
      // Ignore formats the drag source does not expose.
    }
  }
  return files;
}

function useFileDrop({
  onDrop,
  multiple,
  accept,
}: {
  onDrop: (files: FileInfo[]) => void;
  multiple: React.HTMLProps<HTMLInputElement>["multiple"];
  accept: React.HTMLProps<HTMLInputElement>["accept"];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget !== rootRef.current.parentElement) {
      return;
    }
    setIsDragging(false);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function onFileDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    // Chromium invalidates native drag payloads after the drop handler returns.
    // Consume FileList and Dolphin URI formats synchronously.
    onDrop(
      readFileDrop(
        event.dataTransfer,
        (file) => window.player.getPathForFile(file),
        accept,
        Boolean(multiple),
      ),
    );
  }

  function onClick() {
    setIsDragging(false);
    const input = inputRef.current;
    if (input) {
      input.click();
    }
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    onFiles(files);
    event.target.value = "";
  }

  function onFiles(fileList: FileList) {
    const files: FileInfo[] = [];
    const maxFiles = multiple ? fileList.length : Math.min(fileList.length, 1);
    for (let i = 0; i < maxFiles; i++) {
      const file = fileList[i];
      if (!acceptsFile(accept, file.type, file.name)) {
        continue;
      }
      const path = window.player.getPathForFile(file);
      if (!path) continue;
      const name = file.name;
      files.push({ path, name });
    }
    onDrop(files);
  }

  // Use ref callback to make TS happy
  const rootRefCallback = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
  }, []);

  const rootProps = {
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop: onFileDrop,
    onClick,
    ref: rootRefCallback,
  };

  const inputProps = {
    ref: inputRef,
    multiple,
    accept,
    style: {
      display: "none",
    },
    type: "file",
    onChange,
  };

  return { isDragging, rootProps, inputProps };
}

export default useFileDrop;
