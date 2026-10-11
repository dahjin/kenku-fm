import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCORD_ACTIVITY_MAX_LENGTH,
  normalizeNowPlaying,
  nowPlayingTitle,
} from "../src/common/discordPresence";

test("playing uses the editable track title as Discord activity", () => {
  assert.equal(
    nowPlayingTitle(true, "The Sleeping Dragon"),
    "The Sleeping Dragon",
  );
});

test("pause, stop and empty titles clear the activity", () => {
  assert.equal(nowPlayingTitle(false, "The Sleeping Dragon"), undefined);
  assert.equal(nowPlayingTitle(true), undefined);
  assert.equal(nowPlayingTitle(true, "  \n  "), undefined);
  assert.equal(normalizeNowPlaying({ title: "local path" }), undefined);
});

test("presence text is normalized and safely limited", () => {
  assert.equal(
    normalizeNowPlaying("  Rain\n in   Razor Bay  "),
    "Rain in Razor Bay",
  );
  const longTitle = "🎵".repeat(DISCORD_ACTIVITY_MAX_LENGTH + 10);
  assert.equal(
    Array.from(normalizeNowPlaying(longTitle) ?? "").length,
    DISCORD_ACTIVITY_MAX_LENGTH,
  );
});
