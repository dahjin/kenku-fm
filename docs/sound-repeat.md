# Repeating sound effects

Open a sound's **Edit** menu, enable **Repeat at random intervals**, and enter the
minimum and maximum wait in seconds. Click **Done** to save. For example, 3–8
seconds gives a blacksmith hammer a fresh random pause after each strike.

Click Play to start immediately. Each replay waits until the previous sound has
finished, then waits a random duration in the chosen range. Equal values produce
a fixed interval. Supported waits range from 0.1 seconds to 24 hours.

The sound remains active while waiting: its card and player chip show **Waiting**.
Click Stop on the card or remove its player chip to cancel playback and the pending
repeat. Different sounds have independent timers. Deleting a sound or its board
also stops its repeats. Settings are saved; active repeat sessions are not restored
when the app restarts.

Random repeat replaces continuous looping. The existing loop button switches back
to continuous looping. Saving a new interval while waiting restarts that wait with
the new range; disabling random repeat while waiting stops it. Playback errors
cancel the repeat rather than retrying indefinitely.

Run `npm run test:sound-repeat` for timer and audio-lifecycle regression checks.
For a desktop check, start two short effects with different ranges, stop one during
its wait, and verify the other continues. Check edits, deletion, and restarting the
app as well as switching back to continuous looping.

## Random sound groups

On a soundboard, choose **Add group**, give it a name, select its sounds, and set a
minimum/maximum wait. Start the group to play one randomly selected sound
immediately. After it finishes, the group waits a fresh random duration before
selecting another. The same sound may be selected again. A single-member group
works like an individual repeating effect.

Each group plays only one sound at a time. Its members play once per selection,
regardless of their individual loop/repeat settings. Each member's volume and
fade settings are used. Groups and individually triggered sounds are independent,
so multiple groups can build a layered soundscape.

Stop the group using its row or its chip in the player. Stopping, deleting the group,
or deleting its soundboard cancels the current sound and pending wait. Removing a
member prevents future selection; removing the active member stops that sound.
Empty groups stop. An audio failure stops the group and reports an error.

Membership and intervals are saved, but active sessions do not restart when the app
reopens. Run `npm run test:sound-groups` for group playback tests.
