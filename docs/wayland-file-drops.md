# File imports on Wayland

The Linux build selects native Wayland when `XDG_SESSION_TYPE=wayland` or
`WAYLAND_DISPLAY` is present. Keeping Kenku FM and a native Wayland file manager
on the same display protocol allows the compositor to deliver file drops
without translating them through XWayland.

The packaged Linux `kenku-fm` entry point passes `--ozone-platform=wayland`
before Electron starts. An explicit `--ozone-platform` argument always wins, so
`--ozone-platform=x11` remains available for diagnostics. X11 sessions, macOS,
and Windows keep their normal backend. The launcher also clears
`ELECTRON_RUN_AS_NODE`, which otherwise prevents the packaged app from starting.

The player consumes the native `FileList` synchronously and supports Dolphin's
`text/uri-list` representation. Page-level playlist and soundboard drops also
capture Chromium `FileSystemEntry` objects before reading fallback `File`
objects.

Run the backend and launcher checks with `yarn test:linux-display`. Run the drop
parsing checks with `yarn test:audio-file-drop` and `yarn test:audio-drop`.

References:

- [Electron command-line switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
- [Electron's native Wayland default](https://www.electronjs.org/blog/electron-38-0)
