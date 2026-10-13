# Scenes and tabs

Scene definitions are mirrored under a fork-specific browser-storage key.
Official Kenku FM releases share the application profile but do not know about
scenes, so their saved player record can omit that field. The mirror restores
the fork's scenes the next time it opens without changing the official app's
data.

Open **Scenes** on Home. Create a scene (for example, Razor Bay), then create or duplicate tabs for Day, Night and Tension.

The selected scene artwork fills the editor background using the same gradient
treatment as playlist and soundboard pages. Navigation, tab controls and mix
cards use translucent surfaces so the artwork remains visible without reducing
control or text contrast.

Choose a scene from the scene list, then select a tab. The editor shows only the ambience and random groups in that tab; use **Add** to search your soundboards for more. Volume sliders adjust the saved mix. Scene and tab menus contain Rename, Duplicate tab, and Delete. On wide windows, music sits beside the sound layers; narrower windows stack the cards.

The scene editor also provides the source library controls needed to prepare a
mix without leaving the page. **Playlist options** edits crossfade and Smart
Shuffle behavior, and every track matching the tab's tags has a tune icon for
tags, timing, frequency, low-pass and reverb. Ambience sounds and
the member sounds in random groups have the same sound options available. The
controls are available before or after scene activation. Saved filter changes
to a currently playing track or sound take effect without restarting it.
Use a track's play button to start it directly with the tab's tags, volume and
transition without activating the tab's ambience.

Each tab stores:

- A playlist, selected tags (all must match), and music volume.
- Continuous ambience sounds and individual volumes.
- Random sound groups, group volume multipliers, and minimum/maximum delays.
- A transition duration, from 0 to 30 seconds.

Editing saves the preset without changing live playback. **Activate** (or **Apply changes**) takes a snapshot and applies it. The active scene appears above the player pages with a **Stop scene** button. Reopening Kenku restores scene definitions but never starts them automatically.

Tabs reference existing playlist entries, sounds and groups. They do not copy audio files or change the original sound/group settings. Duplicate a tab to reuse the same sea ambience and blacksmith group with different volumes or delays. Shared ambience and running groups retain their players when switching tabs; a changed group delay resets its waiting timer. Each group plays one member at a time, waits after it finishes, and then chooses again. Independent groups can overlap.

Activation selects the saved tags in the referenced playlist and sets music volume. A currently playing track that still matches the new tab can continue. Otherwise music transitions to a matching track. No music, a deleted playlist, or zero matches fades current music to silence. Scene transitions explicitly use the tab duration; normal playlist advancement uses track/playlist crossfade settings. Removed ambience fades out; removed random groups stop and cancel their timers. Stop scene leaves unrelated manual sound effects alone.

Deleted library references are skipped and displayed in the editor so they can be replaced or removed. Deleting an active scene/tab stops its playback. Manual soundboard and playlist controls remain available; Activate reapplies a scene if you have stopped individual sounds.

## Home controls and tab order

Home displays scene artwork cards alongside playlists and soundboards. Click a scene tab button to activate its saved mix without opening the editor; use the stop button on an active scene card to stop it. Clicking the artwork opens that specific scene for editing. Choose **Scene options → Change artwork** to set a built-in or custom image. Existing scenes without artwork use a referenced playlist image when available.

Drag the grip beside a tab in the scene editor to reorder it. On a focused grip, press Space, use arrow keys, then Space to drop (Escape cancels). The order is saved and used on Home. Reordering preserves the selected tab and the active playback snapshot.

Playlist cards on Home show their available tags. Select all desired tags, then Play; a track must match all of them. Updating the filter while that playlist is playing keeps a matching current track, switches away from an excluded track, or pauses when there are no matches. Choosing tags on an idle playlist does not start audio. Soundboard cards provide play/stop buttons for individual sounds and random groups.
