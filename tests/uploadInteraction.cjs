// Run with Electron after buildUpload.cjs. Uses temporary fixtures and profile;
// never opens the user's application or library.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const root = path.resolve(__dirname, "../dist/upload-interaction");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "kenku-upload-test-"));
app.setPath("userData", path.join(temporary, "profile"));
app.disableHardwareAcceleration();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const timeout = setTimeout(() => {
  console.error("Upload test timed out");
  app.exit(1);
}, 60000);

app.whenReady().then(async () => {
  let failures = 0;
  let total = 0;
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 800,
    webPreferences: {
      backgroundThrottling: false,
      preload: path.join(root, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });
  const wc = win.webContents;
  wc.debugger.attach("1.3");
  const files = ["hammer.ogg", "anvil.ogg"].map((name) => {
    const file = path.join(temporary, name);
    fs.writeFileSync(file, "OggS");
    return file;
  });
  try {
    for (const section of ["tracks", "sounds"]) {
      for (const testCase of [
        { scenario: "native", page: true },
        { scenario: "application/ogg", page: true },
        { scenario: "missing-entries", page: true },
        { scenario: "failed-entry-read", page: true },
        { scenario: "dolphin-uri-list", page: true },
        { scenario: "native", page: false },
        { scenario: "application/ogg", page: false },
        { scenario: "dolphin-uri-list", page: false },
        { scenario: "picker", page: false },
      ]) {
        total++;
        const { scenario, page } = testCase;
        await win.loadURL("about:blank");
        await win.loadFile(path.join(root, "index.html"), {
          hash: `${page ? "page-" : ""}${section}`,
        });
        await delay(400);
        if (scenario === "picker") {
          const { root: doc } =
            await wc.debugger.sendCommand("DOM.getDocument");
          const { nodeId } = await wc.debugger.sendCommand(
            "DOM.querySelector",
            { nodeId: doc.nodeId, selector: "input[type=file]" },
          );
          await wc.debugger.sendCommand("DOM.setFileInputFiles", {
            nodeId,
            files,
          });
          await delay(100);
          await wc.executeJavaScript(
            `document.querySelector('button[type=submit]').click()`,
          );
        } else if (scenario === "dolphin-uri-list") {
          await wc.executeJavaScript(`(() => {
            const data = new DataTransfer();
            data.setData('text/uri-list', ${JSON.stringify("file:///tmp/hammer.ogg\r\nfile:///tmp/anvil.ogg\r\n")});
            const target = document.querySelector(${JSON.stringify(page ? ".MuiContainer-root" : "button.MuiButton-outlined")});
            for (const type of ['dragenter', 'dragover', 'drop']) {
              target.dispatchEvent(new DragEvent(type, {bubbles: true, cancelable: true, dataTransfer: data}));
            }
          })()`);
        } else {
          await wc.executeJavaScript(`(() => {
            const scenario = ${JSON.stringify(scenario)};
            const original = DataTransferItem.prototype.webkitGetAsEntry;
            DataTransferItem.prototype.webkitGetAsEntry = function () {
              if (scenario === 'missing-entries') return null;
              const entry = original.call(this);
              if (entry?.isFile) {
                const getFile = entry.file.bind(entry);
                entry.file = (resolve, reject) => {
                  if (scenario === 'failed-entry-read') { reject(new Error('Unavailable file entry')); return; }
                  getFile(file => {
                    if (scenario === 'application/ogg') Object.defineProperty(file, 'type', {value:'application/ogg'});
                    resolve(file);
                  }, reject);
                };
              }
              return entry;
            };
            if (scenario === 'application/ogg') {
              document.addEventListener('drop', event => {
                for (const file of event.dataTransfer.files) Object.defineProperty(file, 'type', {value:'application/ogg'});
              }, true);
            }
          })()`);
          const point = await wc.executeJavaScript(`(() => {
            const rect = document.querySelector(${JSON.stringify(page ? ".MuiContainer-root" : "button.MuiButton-outlined")}).getBoundingClientRect();
            return {x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2)};
          })()`);
          for (const type of ["dragEnter", "dragOver", "drop"]) {
            await wc.debugger.sendCommand("Input.dispatchDragEvent", {
              type,
              x: point.x,
              y: point.y,
              data: { items: [], files, dragOperationsMask: 1 },
            });
            await delay(80);
          }
        }
        if (!page && scenario !== "picker") {
          await delay(200);
          await wc.executeJavaScript(
            `document.querySelector('button[type=submit]').click()`,
          );
        }
        await delay(200);
        const imported = await wc.executeJavaScript(
          `Object.values(window.uploadTestStore.getState().${section === "tracks" ? "playlists.tracks" : "soundboards.sounds"})`,
        );
        try {
          assert.equal(
            imported.length,
            2,
            "both files must import exactly once",
          );
          assert.deepEqual(
            imported.map((file) => file.title),
            ["Hammer", "Anvil"],
          );
          assert.ok(
            imported.every(
              (file) =>
                file.url.startsWith("file:///") && file.url.endsWith(".ogg"),
            ),
          );
          console.log(
            `PASS ${section} ${page ? "page" : "upload area"}: ${scenario}`,
          );
        } catch (error) {
          failures++;
          console.error(
            `FAIL ${section} ${page ? "page" : "upload area"}: ${scenario}: ${error.message}`,
          );
        }
      }
    }
  } catch (error) {
    failures++;
    console.error(error);
  } finally {
    clearTimeout(timeout);
    win.destroy();
    console.log(
      `${total - failures}/${total} upload scenarios passed (Electron ${process.versions.electron})`,
    );
    app.exit(failures ? 1 : 0);
  }
});
