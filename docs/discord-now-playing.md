# Discord Now Playing

When the Kenku FM Discord bot is connected, playlist playback sets the bot's
public activity to **Listening to _track title_**. The activity follows automatic
track changes and scene music as well as tracks started manually.

Pausing or stopping playlist music clears the activity. Resuming restores it,
and reconnecting the bot while a track is playing applies the current title.
Soundboard effects do not replace the music status.

The **Share current song on Discord bot** switch under **Settings > Discord**
controls this feature. Turning it off clears the bot activity immediately.
Turning it back on restores the current track when playlist music is playing.

Kenku sends only the editable title stored for the track. Local paths and audio
filenames are never used as a fallback. Blank titles clear the activity, and
Discord activity text is normalized and limited to 128 characters.
