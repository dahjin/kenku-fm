# Smart Shuffle

Open a playlist's **Edit** menu and enable **Smart Shuffle**. In the player, turn on **Shuffle** and **Repeat playlist**. Ordered playback, Repeat track and Repeat off continue using the existing queue behavior.

- **Avoid the last N tracks**: skip up to the last 100 tracks actually started from that playlist. Default 3; 0 permits repeats. History is kept for this app session, including manual plays, independently for each playlist.
- **Tag priorities**: Normal (1×), Prefer (2×), or Strong (4×). Only tracks matching all active filter tags are eligible. The strongest matching priority is used; priorities do not stack across tags.
- **Track frequency** in Edit Track: Rare (¼×), Normal (1×), or Frequent (4×). This multiplies the tag priority. It changes relative odds, not a guaranteed play count.

Tracks are drawn with replacement after recent-track exclusions, so preferred tracks can play more often over time. If every matching track is excluded, the oldest exclusions are relaxed first. A one-track pool can therefore repeat. Tracks are never pulled from outside the active filter to fill a gap.

The next choice stays fixed while preloading/crossfading; changing filters or priorities recalculates it. Previous walks back through actual listening history, and Next can follow that history forward again. Explicitly selecting a track still plays that track.

Home playlist controls and scene activations also use these rules when choosing a new track. Scene presets do not change a playlist's shuffle rules.
