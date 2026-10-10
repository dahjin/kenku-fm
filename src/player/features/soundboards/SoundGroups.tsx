import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuid } from "uuid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { RootState } from "../../app/store";
import { Soundboard, SoundGroup, editSoundboard } from "./soundboardsSlice";
import { startGroup, stopGroup } from "./soundboardPlaybackSlice";
import { validRepeatInterval } from "./repeatInterval";

export function SoundGroups({ board }: { board: Soundboard }) {
  const dispatch = useDispatch();
  const sounds = useSelector((state: RootState) => state.soundboards.sounds);
  const active = useSelector(
    (state: RootState) => state.soundboardPlayback.groups,
  );
  const [draft, setDraft] = useState<SoundGroup | null>(null);
  const [minimum, setMinimum] = useState("3");
  const [maximum, setMaximum] = useState("8");
  const groups = board.groups ?? [];
  function edit(group?: SoundGroup) {
    const value = group ?? {
      id: uuid(),
      title: "",
      soundIds: [],
      interval: { minSeconds: 3, maxSeconds: 8 },
    };
    setDraft({
      ...value,
      soundIds: value.soundIds.filter(
        (id) => board.sounds.includes(id) && sounds[id],
      ),
    });
    setMinimum(String(value.interval.minSeconds));
    setMaximum(String(value.interval.maxSeconds));
  }
  const interval = { minSeconds: Number(minimum), maxSeconds: Number(maximum) };
  const valid =
    draft?.title.trim() &&
    draft.soundIds.length > 0 &&
    minimum !== "" &&
    maximum !== "" &&
    validRepeatInterval(interval);
  function save() {
    if (!valid) return;
    const group = { ...draft, title: draft.title.trim(), interval };
    dispatch(
      editSoundboard({
        id: board.id,
        groups: groups.some((item) => item.id === group.id)
          ? groups.map((item) => (item.id === group.id ? group : item))
          : [...groups, group],
      }),
    );
    setDraft(null);
  }
  return (
    <>
      <Box
        sx={{ position: "relative", zIndex: 1, px: 2, pb: 2, flexShrink: 0 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle1">Random sound groups</Typography>
          <Button onClick={() => edit()} disabled={!board.sounds.length}>
            Add group
          </Button>
        </Stack>
        <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
          {groups.map((group) => {
            const state = active[group.id];
            const members = group.soundIds.filter((id) => sounds[id]);
            return (
              <Stack
                key={group.id}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  bgcolor: "rgba(34,38,57,0.85)",
                  borderRadius: 2,
                  p: 1,
                  mb: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap>{group.title}</Typography>
                  <Typography variant="caption">
                    {members.length} sounds · {group.interval.minSeconds}–
                    {group.interval.maxSeconds}s
                    {state
                      ? state.waiting
                        ? " · Waiting"
                        : ` · ${sounds[state.soundId]?.title ?? "Playing"}`
                      : ""}
                  </Typography>
                </Box>
                <Button
                  disabled={!members.length && !state}
                  onClick={() =>
                    dispatch(
                      state
                        ? stopGroup(group.id)
                        : startGroup({ id: group.id, title: group.title }),
                    )
                  }
                >
                  {state ? "Stop" : "Start"}
                </Button>
                <Button onClick={() => edit(group)}>Edit</Button>
                <Button
                  onClick={() => {
                    dispatch(stopGroup(group.id));
                    dispatch(
                      editSoundboard({
                        id: board.id,
                        groups: groups.filter((item) => item.id !== group.id),
                      }),
                    );
                  }}
                >
                  Delete
                </Button>
              </Stack>
            );
          })}
        </Box>
      </Box>
      <Dialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Random sound group</DialogTitle>
        {draft && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <DialogContent>
              <TextField
                label="Group name"
                fullWidth
                margin="dense"
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
              <Typography variant="body2">
                Choose sounds. The group plays one at a time, then waits before
                choosing again.
              </Typography>
              <Box sx={{ maxHeight: 240, overflowY: "auto", my: 1 }}>
                {board.sounds
                  .filter((id) => sounds[id])
                  .map((id) => (
                    <FormControlLabel
                      key={id}
                      sx={{ display: "flex" }}
                      label={sounds[id].title}
                      control={
                        <Checkbox
                          checked={draft.soundIds.includes(id)}
                          onChange={(_, checked) =>
                            setDraft({
                              ...draft,
                              soundIds: checked
                                ? [...draft.soundIds, id]
                                : draft.soundIds.filter(
                                    (value) => value !== id,
                                  ),
                            })
                          }
                        />
                      }
                    />
                  ))}
              </Box>
              <Stack direction="row" gap={2}>
                <TextField
                  label="Minimum wait (seconds)"
                  type="number"
                  value={minimum}
                  onChange={(event) => setMinimum(event.target.value)}
                  inputProps={{ min: 0.1, max: 86400, step: 0.1 }}
                />
                <TextField
                  label="Maximum wait (seconds)"
                  type="number"
                  value={maximum}
                  onChange={(event) => setMaximum(event.target.value)}
                  inputProps={{ min: 0.1, max: 86400, step: 0.1 }}
                />
              </Stack>
              {!valid && (
                <Typography variant="caption">
                  Enter a name, select at least one sound, and use a valid delay
                  range (0.1–86400 seconds).
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="submit" disabled={!valid}>
                Save
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </>
  );
}
