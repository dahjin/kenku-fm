import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptsFile } from "../src/player/common/acceptedFile";
import { readFileDrop } from "../src/player/common/useFileDrop";

describe("audio file selection", () => {
  it("accepts files with an audio MIME type", () => {
    assert.equal(acceptsFile("audio/*", "audio/mpeg", "track.mp3"), true);
  });

  it("accepts supported audio extensions when Linux omits the MIME type", () => {
    assert.equal(acceptsFile("audio/*", "", "ambience.FLAC"), true);
  });

  it("accepts supported audio extensions with a generic MIME type", () => {
    assert.equal(
      acceptsFile("audio/*", "application/octet-stream", "bell.ogg"),
      true,
    );
  });

  it("rejects unrelated files", () => {
    assert.equal(acceptsFile("audio/*", "text/plain", "notes.txt"), false);
  });
});

describe("audio upload drop zone", () => {
  it("reads Dolphin URI-list files synchronously", () => {
    const data = {
      files: [],
      getData: (type: string) =>
        type === "text/uri-list"
          ? "file:///audio/hammer.ogg\r\nfile:///audio/anvil.ogg\r\n"
          : "",
    } as unknown as DataTransfer;
    assert.deepEqual(
      readFileDrop(data, () => "", "audio/*", true),
      [
        { path: "/audio/hammer.ogg", name: "hammer.ogg" },
        { path: "/audio/anvil.ogg", name: "anvil.ogg" },
      ],
    );
  });

  it("keeps upstream FileList imports and de-duplicates URI fallbacks", () => {
    const file = new File(["OggS"], "hammer.ogg", { type: "audio/ogg" });
    const data = {
      files: [file],
      getData: (type: string) =>
        type === "text/uri-list" ? "file:///audio/hammer.ogg" : "",
    } as unknown as DataTransfer;
    assert.deepEqual(
      readFileDrop(data, () => "/audio/hammer.ogg", "audio/*", true),
      [{ path: "/audio/hammer.ogg", name: "hammer.ogg" }],
    );
  });
});
