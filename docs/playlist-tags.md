# Playlist tags

Open a playlist and use a track's **Edit** menu to add tags. Type a tag and press
Enter, choose an existing suggestion, or paste `#creep #tavern` and press Enter.
Tags can also be set when adding a track. Tags are case-insensitive single words;
commas, spaces and `#` separate tags. Duplicate tags are removed.

Click the tag buttons above the tracks to select or deselect tags. The buttons
update automatically from the tracks in this playlist and show each tag’s track
count. **All tracks** clears the selection. A track must have **all**
selected tags to appear and be selected for playback. Clear the selection to restore
the entire playlist. Suggestions come from this playlist only. Tags belong to the
playlist entry: importing the same audio into another playlist creates a separate
entry with its own tags.

Changing filters lets the current track finish. Next, previous, shuffle, and
repeat select matching tracks only. If the current track no longer matches,
Next selects the first matching track in playback order. No matches means
playback stops after the current track finishes. Repeat-track does not keep
repeating a track excluded by the filter. Playlist-card and remote play commands
also respect the selected tags.

Tags and each playlist's selected filters are saved with the library. Existing
libraries need no migration: missing tags and filters are treated as empty lists.
Filtering never removes tracks from a playlist or changes its saved order.

Run the regression checks with `npm run test:playlist-tags`.

## Manual playback check

1. Create a playlist with an upbeat track, two tracks tagged `creep tavern`, and
   an untagged track. Set different tags on a second copy in another playlist.
2. Select `creep` and `tavern`. Only the two matching tracks should be shown.
3. Start playback and try Next, Previous, shuffle, repeat-track and repeat-playlist.
   Only matching tracks should be selected.
4. Change the filter while a track plays. It should finish normally, then the new
   matching selection should play. Select tags with no shared matches to check that it stops.
5. Clear filters, reorder tracks, delete a hidden track after clearing filters,
   and import more tracks. Check playback order and filtered selection again.
6. Restart the app and verify tags and filters remain.

## Smart tag choices

Home, playlist pages and scene music settings use the same narrowing tag controls. After selecting `#creepy`, only tags present on the matching tracks remain available. Each count shows how many current results also have that tag; selecting another tag narrows the list again. Selected tags remain visible even at zero matches, so stale or renamed tags can always be deselected. **All tracks** clears the selection.
