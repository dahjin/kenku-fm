import { strict as assert } from "node:assert";
import { test } from "node:test";
import { shouldUseWayland } from "../src/main/linuxDisplay";

test("Linux Wayland sessions use the native file-drop backend", () => {
  assert.equal(
    shouldUseWayland(
      "linux",
      { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" },
      false,
    ),
    true,
  );
  assert.equal(
    shouldUseWayland(
      "linux",
      { WAYLAND_DISPLAY: "wayland-1", DISPLAY: ":1" },
      false,
    ),
    true,
  );
});

test("explicit backend selection is preserved", () => {
  assert.equal(
    shouldUseWayland(
      "linux",
      { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" },
      true,
    ),
    false,
  );
});

test("pure Wayland sessions use native Wayland", () => {
  assert.equal(
    shouldUseWayland("linux", { XDG_SESSION_TYPE: "wayland" }, false),
    true,
  );
});

test("other platforms and ordinary X11 sessions keep their existing behavior", () => {
  assert.equal(
    shouldUseWayland(
      "linux",
      { XDG_SESSION_TYPE: "x11", DISPLAY: ":0" },
      false,
    ),
    false,
  );
  assert.equal(
    shouldUseWayland(
      "win32",
      { WAYLAND_DISPLAY: "wayland-1", DISPLAY: ":0" },
      false,
    ),
    false,
  );
  assert.equal(shouldUseWayland("darwin", {}, false), false);
});
