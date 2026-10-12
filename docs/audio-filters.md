# Audio filters

Kenku FM 1.10 adds per-track and per-sound audio filters. Open **Edit Track**
or **Edit Sound**, expand **Audio filters**, and adjust either effect:

- **Low-pass filter** removes frequencies above its cutoff. Lower values sound
  more distant or muffled, which works well for audio through walls, underwater
  scenes, and voices from another room. The cutoff ranges from 100–20,000 Hz.
- **Reverb** mixes in a generated medium-room tail from 0–100%. Small values
  add space without overwhelming the source; high values are deliberately wet.

The effects are optional and existing tracks and sounds keep their original
sound. Turning low-pass off and setting reverb to zero uses the direct Howler
audio path. Playlist tracks keep HTML5 streaming when filters are enabled, so
long ambience and music files are not fully decoded into memory.

Saved sound filters also apply when that sound is played by a scene, a random
repeat, or a random sound group. Editing a currently playing sound updates its
filter immediately. Playlist track changes apply the next time the track starts.
Crossfades, trim markers, pause/resume, seeking, mute, and volume continue to
operate before the filter graph.

Filter values are included in `GET /v2/library` as `lowPassHz` (`null` when
off) and `reverbMix` (0–1). Local audio and artwork paths remain private.

Run `yarn test:audio-effects` for deterministic graph, normalization, update,
and cleanup checks.
