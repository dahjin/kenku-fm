import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import FormHelperText from "@mui/material/FormHelperText";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addSounds } from "./soundboardsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import type { FileInfo } from "../../common/useFileDrop";
import { cleanFileName, encodeFilePath } from "../../../renderer/common/drop";

type SoundAddProps = {
  soundboardId: string;
  open: boolean;
  onClose: () => void;
};

export function SoundAdd({ soundboardId, open, onClose }: SoundAddProps) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [url, setURL] = useState("");
  const [fadeIn, setFadeIn] = useState(100);
  const [fadeOut, setFadeOut] = useState(100);
  const [files, setFiles] = useState<FileInfo[]>([]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setURL("");
      setFiles([]);
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleFadeInChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    setFadeIn(isNaN(num) ? 0 : num);
  }

  function handleFadeOutChange(event: React.ChangeEvent<HTMLInputElement>) {
    const num = Number.parseInt(event.target.value);
    setFadeOut(isNaN(num) ? 0 : num);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const sounds = files.length
      ? files.map((file, index) => ({
          id: uuid(),
          title:
            files.length === 1 && index === 0
              ? title
              : cleanFileName(file.name),
          url: encodeFilePath(file.path),
          loop: false,
          volume: 1,
          fadeIn,
          fadeOut,
        }))
      : [{ id: uuid(), title, url, loop: false, volume: 1, fadeIn, fadeOut }];
    dispatch(addSounds({ sounds, soundboardId }));
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Sounds</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector
            value={url}
            onChange={(value) => {
              setURL(value);
              setFiles([]);
            }}
            onFileName={setTitle}
            multiple
            onFiles={setFiles}
          />
          {files.length > 1 ? (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                {files.length} sounds selected
              </Typography>
              <List dense sx={{ maxHeight: 180, overflowY: "auto" }}>
                {files.map((file) => (
                  <ListItem key={`${file.path}:${file.name}`} disableGutters>
                    <ListItemText primary={cleanFileName(file.name)} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <TextField
              margin="dense"
              id="name"
              label="Name"
              fullWidth
              autoComplete="off"
              value={title}
              onChange={handleTitleChange}
            />
          )}
          <Box sx={{ display: "flex", gap: 1, my: 1 }}>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-in-helper-text">Fade In</FormHelperText>
              <Input
                margin="dense"
                fullWidth
                autoComplete="off"
                id="fade-in"
                value={`${fadeIn}`}
                onChange={handleFadeInChange}
                endAdornment={
                  <InputAdornment position="end">ms</InputAdornment>
                }
                aria-describedby="fade-in-helper-text"
                inputProps={{
                  "aria-label": "fade in",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />
            </FormControl>
            <FormControl variant="standard" fullWidth>
              <FormHelperText id="fade-out-helper-text">
                Fade Out
              </FormHelperText>
              <Input
                margin="dense"
                fullWidth
                autoComplete="off"
                id="fade-out"
                value={`${fadeOut}`}
                onChange={handleFadeOutChange}
                endAdornment={
                  <InputAdornment position="end">ms</InputAdornment>
                }
                aria-describedby="fade-out-helper-text"
                inputProps={{
                  "aria-label": "fade out",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!files.length && (!title || !url)} type="submit">
            Add {files.length > 1 ? `${files.length} sounds` : "sound"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
