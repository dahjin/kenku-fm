# Audio import regression tests

Run `yarn test:audio-drop` for Ogg MIME variants, native File identity, multi-file
deduplication, optional directory APIs, unreadable files, and paginated folders.

Run `yarn test:upload-interaction` in a desktop session for eighteen browser
scenarios using the real playlist/soundboard pages, upload areas, Redux reducers,
and player preload.
The test supplies real local files through Chromium's drag input API and verifies
the imported names and URLs. It also verifies both Add dialogs' file pickers.
The profile and media fixtures are temporary; the user's library is never loaded.

The browser suite simulates alternate Ogg MIME metadata, unavailable/broken
filesystem entries, and Dolphin's URI-list fallback. Both the full library pages
and the dashed upload areas are drag-tested. It cannot automate the Wayland
compositor itself.
For a manual check, drag multiple `.ogg` files from Dolphin into an open playlist
and into an open soundboard; verify their names, counts, and playback. Also test
the Add dialog's file picker and a folder containing audio.

During development the unchanged importer passed 4/10 original browser
scenarios; the fixed importer passed all scenarios using system Electron 43.7.9. Bundled Electron 37
could not launch renderer subprocesses in the agent's test environment.
To use an alternate installed Electron for this test:

```sh
node tests/buildUpload.cjs
env -u ELECTRON_RUN_AS_NODE electron43 tests/uploadInteraction.cjs
```
