import assert from "node:assert/strict";
import test from "node:test";
import {
  comfortableDensity,
  compactDensity,
  getDisplayDensity,
  settingsPanelWidth,
  topBarHeight,
} from "../src/common/displayDensity";
import settingsReducer, {
  setCompactMode,
} from "../src/renderer/features/settings/settingsSlice";
import { getBounds } from "../src/renderer/features/tabs/getBounds";

test("comfortable mode preserves the established layout measurements", () => {
  assert.deepEqual(getDisplayDensity(false), comfortableDensity);
  assert.deepEqual(getDisplayDensity(), comfortableDensity);
  assert.equal(comfortableDensity.sidebarWidth, 240);
  assert.equal(comfortableDensity.cardImageHeight, 200);
  assert.equal(comfortableDensity.contentClearance, 248);
});

test("compact mode reduces every space-consuming layout measurement", () => {
  const compact = getDisplayDensity(true);
  assert.deepEqual(compact, compactDensity);

  for (const key of [
    "sidebarWidth",
    "tabBarPadding",
    "tabMinWidth",
    "cardImageHeight",
    "cardContentPadding",
    "gridSpacing",
    "pageGap",
    "pageMarginTop",
    "pageHeaderPadding",
    "pageHorizontalPadding",
    "contentClearance",
    "playerBottom",
    "playerPadding",
    "playerWideBreakpoint",
  ] as const) {
    assert.ok(
      compact[key] < comfortableDensity[key],
      `${key} should be smaller in compact mode`,
    );
  }
});

test("compact mode shows more library items at both responsive sizes", () => {
  assert.ok(
    compactDensity.homeItemLimitSmall > comfortableDensity.homeItemLimitSmall,
  );
  assert.ok(
    compactDensity.homeItemLimitLarge > comfortableDensity.homeItemLimitLarge,
  );
});

test("the settings panel stays usable when compact navigation is enabled", () => {
  assert.equal(settingsPanelWidth, 280);
  assert.ok(settingsPanelWidth > compactDensity.sidebarWidth);
});

test("the drawer and tab strip share one stable header height", () => {
  assert.equal(topBarHeight, 52);
});

test("compact mode is opt-in and can be toggled reversibly in settings", () => {
  const initial = settingsReducer(undefined, { type: "test/initial" });
  assert.equal(initial.compactMode, false);

  const compact = settingsReducer(initial, setCompactMode(true));
  assert.equal(compact.compactMode, true);
  assert.equal(
    initial.compactMode,
    false,
    "the previous state remains unchanged",
  );

  const comfortable = settingsReducer(compact, setCompactMode(false));
  assert.equal(comfortable.compactMode, false);
});

test("embedded player bounds follow the live compact sidebar width", () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  let drawerWidth = comfortableDensity.sidebarWidth;

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      getElementById(id: string) {
        if (id === "action-drawer") return { clientWidth: drawerWidth };
        if (id === "controls") return { clientHeight: 48 };
        return null;
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { innerWidth: 800, innerHeight: 600 },
  });

  try {
    assert.deepEqual(getBounds(), {
      x: 240,
      y: 48,
      width: 560,
      height: 552,
    });

    drawerWidth = settingsPanelWidth;
    assert.deepEqual(getBounds(), {
      x: 280,
      y: 48,
      width: 520,
      height: 552,
    });

    drawerWidth = compactDensity.sidebarWidth;
    assert.deepEqual(getBounds(), {
      x: 200,
      y: 48,
      width: 600,
      height: 552,
    });

    drawerWidth = 0;
    assert.deepEqual(getBounds(), {
      x: 0,
      y: 48,
      width: 800,
      height: 552,
    });
  } finally {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});
