import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { nanoid } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { getRandomBackground } from "../../backgrounds";
import { ImageSelector } from "../../common/ImageSelector";
import { saveScene } from "./scenesSlice";

export function SceneAdd({ onClose }: { onClose: () => void }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [background, setBackground] = useState(getRandomBackground);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          dispatch(
            saveScene({
              id: nanoid(),
              title: title.trim(),
              background,
              tabs: [
                {
                  id: nanoid(),
                  title: "Day",
                  transitionSeconds: 2,
                  sounds: [],
                  groups: [],
                },
              ],
            }),
          );
          onClose();
        }}
      >
        <DialogTitle>New scene</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            placeholder="Razor Bay"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <ImageSelector value={background} onChange={setBackground} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!title.trim()}>
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
