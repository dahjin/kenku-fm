// Exercises the packaged main and player renderers in hidden Electron windows.
// It uses an isolated profile and never opens or modifies the user's library.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

const repository = path.resolve(__dirname, "..");
const rendererRoot = path.join(
  repository,
  "out/Kenku FM-linux-x64/resources/app/.webpack/renderer",
);
const mainPage = path.join(rendererRoot, "main_window/index.html");
const mainPreload = path.join(rendererRoot, "main_window/preload.js");
const playerPage = path.join(rendererRoot, "player_window/index.html");
const playerPreload = path.join(rendererRoot, "player_window/preload.js");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "kenku-compact-test-"));

for (const file of [mainPage, mainPreload, playerPage, playerPreload]) {
  assert.ok(fs.existsSync(file), `Package output is missing: ${file}`);
}

app.setPath("userData", path.join(temporary, "profile"));

let compactMode = false;
let playerWindow;
let latestBounds;
let viewId = 40;

ipcMain.on("GET_PLATFORM", (event) => {
  event.returnValue = "linux";
});
ipcMain.on("GET_VERSION", (event) => {
  event.returnValue = "compact-mode-test";
});
ipcMain.on("PLAYER_GET_URL", (event) => {
  event.returnValue = `file://${playerPage}`;
});
ipcMain.on("PLAYER_GET_PRELOAD_URL", (event) => {
  event.returnValue = playerPreload;
});
ipcMain.on("PLAYER_GET_COMPACT_MODE", (event) => {
  event.returnValue = compactMode;
});
ipcMain.on("PLAYER_SET_COMPACT_MODE", (_event, enabled) => {
  compactMode = enabled === true;
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send("PLAYER_COMPACT_MODE_CHANGED", compactMode);
  }
});
ipcMain.on("BROWSER_VIEW_CREATE_BROWSER_VIEW", (event) => {
  viewId += 1;
  event.returnValue = viewId;
});
ipcMain.on(
  "BROWSER_VIEW_SET_BROWSER_VIEW_BOUNDS",
  (_event, _id, x, y, width, height) => {
    latestBounds = { x, y, width, height };
  },
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(webContents, expression, description) {
  const deadline = Date.now() + 10000;
  let result;
  while (Date.now() < deadline) {
    result = await webContents.executeJavaScript(expression);
    if (result) return result;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function createWindow(page, preload, width = 800, height = 640) {
  const win = new BrowserWindow({
    show: false,
    width,
    height,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      preload,
      sandbox: true,
    },
  });
  return win.loadFile(page).then(() => win);
}

const readMainLayout = (webContents) =>
  webContents.executeJavaScript(`(() => {
    const root = JSON.parse(localStorage.getItem("persist:root") || "{}");
    const settings = JSON.parse(root.settings || "{}");
    const label = [...document.querySelectorAll("label")].find((node) =>
      node.textContent.includes("Compact player layout")
    );
    return {
      drawerWidth: document.getElementById("action-drawer")?.clientWidth,
      navigationWidth: document.querySelector(".MuiDrawer-paper")?.clientWidth,
      settingsWidth: document.querySelector(".MuiDialog-root")?.clientWidth,
      drawerToolbarHeight: document.getElementById("drawer-toolbar")?.clientHeight,
      tabBarHeight: document.getElementById("tab-bar")?.clientHeight,
      checked: label?.querySelector('input[type="checkbox"]')?.checked,
      persisted: settings.compactMode,
      fatal: document.body.innerText.includes("Oops, something went wrong")
    };
  })()`);

const readPlayerLayout = (webContents) =>
  webContents.executeJavaScript(`(() => {
    const heading = [...document.querySelectorAll("h1")].find(
      (node) => node.textContent === "Library"
    );
    const container = document.querySelector(".MuiContainer-root");
    const cardContent = document.querySelector(".MuiCardContent-root");
    const cardStyle = cardContent && getComputedStyle(cardContent);
    return {
      headingSize: heading && getComputedStyle(heading).fontSize,
      marginTop: container && getComputedStyle(container).marginTop,
      marginBottom: container && getComputedStyle(container).marginBottom,
      cardPaddingTop: cardStyle?.paddingTop,
      cardPaddingBottom: cardStyle?.paddingBottom,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      fatal: document.body.innerText.includes("Oops, something went wrong")
    };
  })()`);

async function openSettings(webContents) {
  await webContents.executeJavaScript(
    `document.querySelector('[aria-label="Settings"]').click()`,
  );
  await waitFor(
    webContents,
    `[...document.querySelectorAll("label")].some((node) =>
      node.textContent.includes("Compact player layout"))`,
    "compact mode setting",
  );
}

async function toggleCompact(webContents) {
  return webContents.executeJavaScript(`(() => {
    const label = [...document.querySelectorAll("label")].find((node) =>
      node.textContent.includes("Compact player layout")
    );
    const input = label?.querySelector('input[type="checkbox"]');
    if (!input) return false;
    input.click();
    return true;
  })()`);
}

async function waitForBoundsX(expected) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (latestBounds?.x === expected) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for player bounds x=${expected}`);
}

const timeout = setTimeout(() => {
  console.error("Compact mode interaction test timed out");
  app.exit(1);
}, 60000);

app.whenReady().then(async () => {
  let mainWindow;
  try {
    playerWindow = await createWindow(playerPage, playerPreload, 600, 640);
    await waitFor(
      playerWindow.webContents,
      `document.body.innerText.includes("Library")`,
      "player library",
    );

    mainWindow = await createWindow(mainPage, mainPreload);
    await waitFor(
      mainWindow.webContents,
      `Boolean(document.querySelector('[aria-label="Settings"]'))`,
      "main renderer",
    );
    await openSettings(mainWindow.webContents);

    const initialMain = await readMainLayout(mainWindow.webContents);
    const initialPlayer = await readPlayerLayout(playerWindow.webContents);
    assert.deepEqual(initialMain, {
      drawerWidth: 280,
      navigationWidth: 240,
      settingsWidth: 280,
      drawerToolbarHeight: 52,
      tabBarHeight: 52,
      checked: false,
      persisted: false,
      fatal: false,
    });
    assert.deepEqual(initialPlayer, {
      headingSize: "34px",
      marginTop: "32px",
      marginBottom: "248px",
      cardPaddingTop: "16px",
      cardPaddingBottom: "16px",
      horizontalOverflow: false,
      fatal: false,
    });

    assert.equal(await toggleCompact(mainWindow.webContents), true);
    await waitFor(
      mainWindow.webContents,
      `document.getElementById("action-drawer")?.clientWidth === 280 &&
        document.querySelector(".MuiDrawer-paper")?.clientWidth === 200`,
      "compact main layout",
    );
    await waitFor(
      mainWindow.webContents,
      `(() => {
        const root = JSON.parse(localStorage.getItem("persist:root") || "{}");
        return JSON.parse(root.settings || "{}").compactMode === true;
      })()`,
      "persisted compact preference",
    );
    await waitFor(
      playerWindow.webContents,
      `getComputedStyle(document.querySelector("h1")).fontSize === "24px"`,
      "compact player layout",
    );

    const compactMain = await readMainLayout(mainWindow.webContents);
    const compactPlayer = await readPlayerLayout(playerWindow.webContents);
    assert.deepEqual(compactMain, {
      drawerWidth: 280,
      navigationWidth: 200,
      settingsWidth: 280,
      drawerToolbarHeight: 52,
      tabBarHeight: 52,
      checked: true,
      persisted: true,
      fatal: false,
    });
    assert.deepEqual(compactPlayer, {
      headingSize: "24px",
      marginTop: "16px",
      marginBottom: "184px",
      cardPaddingTop: "8px",
      cardPaddingBottom: "8px",
      horizontalOverflow: false,
      fatal: false,
    });
    assert.equal(compactMode, true);
    await waitForBoundsX(280);

    mainWindow.destroy();
    mainWindow = await createWindow(mainPage, mainPreload);
    await waitFor(
      mainWindow.webContents,
      `document.getElementById("action-drawer")?.clientWidth === 200`,
      "persisted compact layout after restart",
    );
    await openSettings(mainWindow.webContents);
    assert.deepEqual(await readMainLayout(mainWindow.webContents), compactMain);

    assert.equal(await toggleCompact(mainWindow.webContents), true);
    await waitFor(
      mainWindow.webContents,
      `document.getElementById("action-drawer")?.clientWidth === 280 &&
        document.querySelector(".MuiDrawer-paper")?.clientWidth === 240`,
      "restored comfortable main layout",
    );
    await waitFor(
      playerWindow.webContents,
      `getComputedStyle(document.querySelector("h1")).fontSize === "34px"`,
      "restored comfortable player layout",
    );
    assert.equal(compactMode, false);
    await waitForBoundsX(280);

    await mainWindow.webContents.executeJavaScript(`
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent.trim() === "Done")
        .click()
    `);
    await waitFor(
      mainWindow.webContents,
      `document.getElementById("action-drawer")?.clientWidth === 240`,
      "comfortable navigation width after closing settings",
    );
    await waitForBoundsX(240);

    console.log(
      "PASS compact mode defaults, live updates, persistence and restore",
    );
    console.log(
      "PASS compact player fits a 600px hidden test window without overflow",
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    if (playerWindow && !playerWindow.isDestroyed()) playerWindow.destroy();
    fs.rmSync(temporary, { recursive: true, force: true });
    app.exit(process.exitCode || 0);
  }
});
