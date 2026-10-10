import { v4 as uuid } from "uuid";
import { cleanFileName, encodeFilePath } from "../../renderer/common/drop";
import { acceptsFile } from "./acceptedFile";

export interface AudioFile {
  id: string;
  url: string;
  title: string;
}

export type Directory = {
  path: string;
  name: string;
  audioFiles: AudioFile[];
};
export type Directories = Record<string, Directory>;

export function filePathsFromUriList(value: string): string[] {
  const paths: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    const uri = line.trim();
    if (!uri || uri.startsWith("#")) continue;
    try {
      const url = new URL(uri);
      if (url.protocol !== "file:") continue;
      if (url.hostname && url.hostname !== "localhost") continue;
      paths.push(decodeURIComponent(url.pathname));
    } catch {
      // Ignore non-URI clipboard text from the drag source.
    }
  }
  return paths;
}

/** Preserve native File objects and upstream FileSystemEntry fallbacks while
 * the drop payload is accessible.
 */
export async function readAudioDrop(
  data: DataTransfer,
  getPath: (file: File) => string,
): Promise<{ directories: Directories; errors: string[] }> {
  const directories: Directories = {
    "/": { path: "/", name: "root", audioFiles: [] },
  };
  const errors: string[] = [];
  const seen = new Set<string>();
  const importedNames = new Set<string>();
  const unreadable = new Set<string>();
  const files: FileSystemFileEntry[] = [];
  const folders: FileSystemDirectoryEntry[] = [];
  const directFiles = Array.from(data.files);
  const itemFiles: File[] = [];
  const uriPaths: string[] = [];

  function addPath(path: string) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (!name || !acceptsFile("audio/*", "", name)) return;
    const url = encodeFilePath(path);
    if (seen.has(url)) return;
    seen.add(url);
    importedNames.add(name);
    unreadable.delete(name);
    directories["/"].audioFiles.push({
      id: uuid(),
      title: cleanFileName(name),
      url,
    });
  }

  function addFile(file: File, directory: Directory) {
    if (!acceptsFile("audio/*", file.type, file.name)) return;
    try {
      const path = getPath(file);
      if (!path) throw new Error("Missing local path");
      const url = encodeFilePath(path);
      importedNames.add(file.name);
      unreadable.delete(file.name);
      if (seen.has(url)) return;
      seen.add(url);
      directory.audioFiles.push({
        id: uuid(),
        title: cleanFileName(file.name),
        url,
      });
    } catch {
      if (!importedNames.has(file.name)) unreadable.add(file.name);
    }
  }

  // Capture every native handle while the drop event is active. Dolphin's
  // Chromium payload can lose access when getAsFile() is called before
  // webkitGetAsEntry(), so preserve the upstream entry-first ordering.
  for (const item of Array.from(data.items)) {
    if (item.kind !== "file") continue;
    try {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isFile) files.push(entry as FileSystemFileEntry);
      else if (entry?.isDirectory)
        folders.push(entry as FileSystemDirectoryEntry);
    } catch {
      // Direct files do not depend on this optional directory API.
    }
    try {
      const file = item.getAsFile();
      if (file) itemFiles.push(file);
    } catch {
      // The captured entry or dataTransfer.files can still provide the file.
    }
  }

  // Read string formats before yielding to entry.file(), because native drag
  // data is only guaranteed to remain available during the drop callback.
  for (const type of ["text/uri-list", "text/plain"]) {
    try {
      uriPaths.push(...filePathsFromUriList(data.getData(type)));
    } catch {
      // Some drag sources deny access to formats they do not provide.
    }
  }

  // Keep upstream's direct FileSystemEntry path. Dolphin can expose a
  // File here that webUtils can resolve even when dataTransfer.files and
  // DataTransferItem.getAsFile() contain pathless File objects.
  for (const entry of files) {
    try {
      const file = await new Promise<File>((resolve, reject) =>
        entry.file(resolve, reject),
      );
      addFile(file, directories["/"]);
    } catch {
      if (!importedNames.has(entry.name) && !unreadable.has(entry.name))
        errors.push(`Could not read ${entry.name}.`);
    }
  }

  // Retain FileList, DataTransferItem, and URI fallbacks for drag sources that
  // do not implement Chromium's legacy FileSystemEntry API.
  for (const file of directFiles) addFile(file, directories["/"]);
  for (const file of itemFiles) addFile(file, directories["/"]);
  for (const path of uriPaths) addPath(path);

  async function readFolder(entry: FileSystemDirectoryEntry, parent: string) {
    const path = `${parent}${entry.name}/`;
    const directory = { path, name: entry.name, audioFiles: [] as AudioFile[] };
    directories[path] = directory;
    try {
      const reader = entry.createReader();
      let entries: FileSystemEntry[];
      do {
        entries = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        );
        for (const child of entries) {
          if (child.isDirectory) {
            await readFolder(child as FileSystemDirectoryEntry, path);
          } else if (child.isFile) {
            try {
              const file = await new Promise<File>((resolve, reject) =>
                (child as FileSystemFileEntry).file(resolve, reject),
              );
              addFile(file, directory);
            } catch {
              errors.push(`Could not read ${child.name}.`);
            }
          }
        }
      } while (entries.length);
    } catch {
      errors.push(
        `Could not read folder ${entry.name}. Try dropping its files.`,
      );
    }
  }

  for (const folder of folders) await readFolder(folder, "/");
  for (const name of unreadable)
    errors.push(`Could not read ${name}. Try selecting it with Add.`);
  if (!seen.size && !errors.length) {
    errors.push(
      "No supported audio files were received. Try selecting the files with Add.",
    );
  }
  return { directories, errors };
}
