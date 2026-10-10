const fs = require("node:fs");
const path = require("node:path");

/**
 * Electron must receive the Wayland backend flag before its main process starts.
 * Keep the executable name expected by Linux packages as a launcher and move
 * the Electron binary beside it.
 */
function installLinuxLauncher(outputPath, executableName = "kenku-fm") {
  const launcherPath = path.join(outputPath, executableName);
  const binaryName = `${executableName}-bin`;
  const binaryPath = path.join(outputPath, binaryName);

  fs.renameSync(launcherPath, binaryPath);
  fs.writeFileSync(
    launcherPath,
    `#!/bin/sh
unset ELECTRON_RUN_AS_NODE
app_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

for arg do
  case "$arg" in
    --ozone-platform|--ozone-platform=*)
      exec "$app_dir/${binaryName}" "$@"
      ;;
  esac
done

if [ "$XDG_SESSION_TYPE" = "wayland" ] || [ -n "$WAYLAND_DISPLAY" ]; then
  exec "$app_dir/${binaryName}" --ozone-platform=wayland "$@"
fi

exec "$app_dir/${binaryName}" "$@"
`,
    { mode: 0o755 },
  );
}

module.exports = { installLinuxLauncher };
