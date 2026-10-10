import assert from "node:assert/strict";
import { test } from "node:test";
import { readAudioDrop } from "../src/player/common/audioDrop";

const ogg = (type = "application/ogg", name = "hammer.ogg") =>
  new File(["OggS"], name, { type });
function payload(
  files: File[],
  entries?: (FileSystemEntry | null)[],
  formats: Record<string, string> = {},
) {
  return {
    files,
    items: files.map((file, i) => ({
      kind: "file",
      getAsFile: () => file,
      webkitGetAsEntry: () => entries?.[i] ?? null,
    })),
    getData: (type: string) => formats[type] ?? "",
  } as unknown as DataTransfer;
}
const getPath = (file: File) => `/audio/${file.name}`;

test("imports Ogg variants from native files even without filesystem entries", async () => {
  for (const type of [
    "audio/ogg",
    "application/ogg",
    "audio/x-vorbis+ogg",
    "",
    "application/octet-stream",
  ]) {
    const file = ogg(type);
    const result = await readAudioDrop(payload([file]), (actual) => {
      assert.equal(actual, file, "preserve the native File for Electron");
      return getPath(actual);
    });
    assert.equal(result.directories["/"].audioFiles.length, 1);
    assert.equal(
      result.directories["/"].audioFiles[0].url,
      "file:///audio/hammer.ogg",
    );
    assert.deepEqual(result.errors, []);
  }
});

test("upstream file-entry callbacks do not duplicate direct multi-file imports", async () => {
  let callbacks = 0;
  const dropped = [ogg(), ogg("audio/ogg", "anvil.ogg")];
  const entries = dropped.map(
    (file) =>
      ({
        isFile: true,
        isDirectory: false,
        name: file.name,
        file: (resolve: (file: File) => void) => {
          callbacks++;
          resolve(file);
        },
      }) as unknown as FileSystemEntry,
  );
  const result = await readAudioDrop(payload(dropped, entries), getPath);
  assert.equal(callbacks, 2);
  assert.deepEqual(
    result.directories["/"].audioFiles.map((f) => f.title),
    ["Hammer", "Anvil"],
  );
  assert.deepEqual(result.errors, []);
});

test("imports Dolphin files through upstream's entry.file fallback", async () => {
  const pathless = ogg();
  const resolved = ogg();
  let entryCaptured = false;
  const entry = {
    isFile: true,
    isDirectory: false,
    name: resolved.name,
    file: (resolve: (file: File) => void) => resolve(resolved),
  } as unknown as FileSystemEntry;
  const data = {
    files: [pathless],
    items: [
      {
        kind: "file",
        webkitGetAsEntry: () => {
          entryCaptured = true;
          return entry;
        },
        getAsFile: () => {
          assert.equal(
            entryCaptured,
            true,
            "capture entry before reading File",
          );
          return pathless;
        },
      },
    ],
    getData: () => "",
  } as unknown as DataTransfer;
  const result = await readAudioDrop(data, (file) =>
    file === resolved ? getPath(file) : "",
  );
  assert.deepEqual(
    result.directories["/"].audioFiles.map((file) => file.url),
    ["file:///audio/hammer.ogg"],
  );
  assert.deepEqual(result.errors, []);
});

test("a broken optional entry API cannot prevent direct file imports", async () => {
  const data = payload([ogg()]);
  data.items[0].webkitGetAsEntry = () => {
    throw new Error("Unavailable");
  };
  assert.equal(
    (await readAudioDrop(data, getPath)).directories["/"].audioFiles.length,
    1,
  );
});

test("imports Dolphin URI-list files when Electron provides no File path", async () => {
  const result = await readAudioDrop(
    payload([ogg(), ogg("application/ogg", "anvil.ogg")], undefined, {
      "text/uri-list":
        "# Dolphin file drag\r\nfile:///home/dahjin/Music/hammer.ogg\r\nfile:///home/dahjin/Music/anvil.ogg\r\n",
    }),
    () => "",
  );
  assert.deepEqual(
    result.directories["/"].audioFiles.map((file) => file.url),
    [
      "file:///home/dahjin/Music/hammer.ogg",
      "file:///home/dahjin/Music/anvil.ogg",
    ],
  );
  assert.deepEqual(result.errors, []);
});

test("never creates empty file URLs and reports unsupported or unreadable drops", async () => {
  const unreadable = await readAudioDrop(payload([ogg()]), () => "");
  assert.equal(unreadable.directories["/"].audioFiles.length, 0);
  assert.ok(unreadable.errors.length);
  const unsupported = await readAudioDrop(
    payload([new File(["text"], "notes.txt", { type: "text/plain" })]),
    getPath,
  );
  assert.equal(unsupported.directories["/"].audioFiles.length, 0);
  assert.ok(unsupported.errors.length);
});

test("reads every directory batch and preserves nested folder names", async () => {
  const fileEntry = (file: File) => ({
    isFile: true,
    isDirectory: false,
    name: file.name,
    file: (resolve: (file: File) => void) => resolve(file),
  });
  const folder = (name: string, batches: unknown[][]) => ({
    isDirectory: true,
    isFile: false,
    name,
    createReader: () => {
      let index = 0;
      return {
        readEntries: (resolve: (entries: unknown[]) => void) =>
          resolve(batches[index++] ?? []),
      };
    },
  });
  const nested = folder("night", [[fileEntry(ogg("", "owl.ogg"))]]);
  const root = folder("forest", [[fileEntry(ogg())], [nested]]);
  const data = {
    files: [],
    items: [
      { kind: "file", getAsFile: () => null, webkitGetAsEntry: () => root },
    ],
  } as unknown as DataTransfer;
  const result = await readAudioDrop(data, getPath);
  assert.equal(result.directories["/forest/"].audioFiles.length, 1);
  assert.equal(result.directories["/forest/night/"].audioFiles[0].title, "Owl");
  assert.deepEqual(result.errors, []);
});
