# Playlist crossfades

Open **Edit Playlist** and set **Crossfade (seconds)**. The setting is per playlist,
from 0 to 30 seconds. Zero disables crossfading and is the default for existing
playlists. Try 3 seconds for music or a longer fade for ambience.

The player preloads the next eligible track and begins it before the current track
ends. Both tracks overlap while one fades out and the other fades in. Each overlap
is capped at half the duration of either track. Slow or failed loads can still
prevent a seamless transition.

To keep first playback responsive, the next track loads only when the current
track reaches the crossfade window plus five seconds of preparation time.
Starting a playlist therefore does not immediately load two audio files.

Tag filters, shuffle and repeat determine which track comes next. No next matching
track means the current track finishes and playback stops. Changes to filters
invalidate a preloaded track if it is no longer next in the queue. Next/Previous
can also crossfade; restarting the same track with these controls seeks to its
start. Automatic repeat-track can crossfade a fresh instance of the same track.

Pause/resume, mute and volume apply to both sides of an overlap. Seeking ends the
outgoing side immediately. Stopping or replacing a pending track cancels its load
callbacks so it cannot start afterward.

Run `npm run test:playlist-crossfade` for deterministic audio lifecycle checks.
On desktop, try a 3-second fade between two tracks, pause during the overlap, change
volume, and change tag filters near the end of a track. Also check 0-second fades
and very short tracks.

## Track markers and overrides

**Edit Track** includes a two-handle timeline for the playable start and end. Drag either side for quick trimming, then use the numeric fields beside it for 0.1-second adjustments. Leave End blank for the file end. While that track is selected in the player, the timeline displays its playhead and the buttons can capture that position. Saved markers apply the next time the track plays.

The start marker skips an intro; the end marker cuts trailing silence or an unwanted outro. Repeat and automatic advance respect these markers. Crossfade happens before the end marker, with overlap capped at half each track's trimmed length. Seeking is limited to the marked range; displayed times remain file timestamps.

A per-track slider controls the transition out of that track and shades the corresponding tail on its timeline. Its numeric field allows 0.1-second adjustments. **Use playlist setting** restores inheritance; set the override to **0** for a track with a baked-in fade, or choose a different duration up to 30 seconds. Explicit scene switches use the scene's transition duration instead.

If a file is replaced with a shorter one, playback clamps the end to its duration and ignores an out-of-range start rather than attempting an empty loop. The saved marker fields remain editable.
