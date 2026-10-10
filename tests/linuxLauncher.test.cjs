const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { installLinuxLauncher } = require("../scripts/packageLinuxLauncher.cjs");

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kenku-launcher-"));
  const executable = path.join(directory, "kenku-fm");
  fs.writeFileSync(
    executable,
    '#!/bin/sh\nprintf "%s\\n" "${ELECTRON_RUN_AS_NODE-unset}" "$@"\n',
    { mode: 0o755 },
  );
  installLinuxLauncher(directory);
  return { directory, executable };
}

test("packaged Linux launcher matches a native Wayland file manager", (t) => {
  const { directory, executable } = fixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const result = spawnSync(executable, ["file with spaces.ogg"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      DISPLAY: ":0",
      WAYLAND_DISPLAY: "wayland-1",
      XDG_SESSION_TYPE: "wayland",
      ELECTRON_RUN_AS_NODE: "1",
    },
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "unset",
    "--ozone-platform=wayland",
    "file with spaces.ogg",
  ]);
});

test("an explicit platform remains available for diagnostics", (t) => {
  const { directory, executable } = fixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const result = spawnSync(executable, ["--ozone-platform=wayland"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "unset",
    "--ozone-platform=wayland",
  ]);
});

test("a pure Wayland session still selects native Wayland", (t) => {
  const { directory, executable } = fixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const result = spawnSync(executable, ["track.ogg"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      WAYLAND_DISPLAY: "wayland-1",
      XDG_SESSION_TYPE: "wayland",
    },
  });
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "unset",
    "--ozone-platform=wayland",
    "track.ogg",
  ]);
});
