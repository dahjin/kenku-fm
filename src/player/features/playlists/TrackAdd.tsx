import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { v4 as uuid } from "uuid";

import { useDispatch, useSelector } from "react-redux";
import { addTracks } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { addTracksToQueueIfNeeded } from "./playlistPlaybackSlice";
import { RootState } from "../../app/store";
import { getPlaylistTags } from "./playlistTags";
import { TagInput } from "./TagInput";
import { cleanFileName, encodeFilePath } from "../../../renderer/common/drop";
import type { FileInfo } from "../../common/useFileDrop";

type TrackAddProps = {
  playlistId: string;
  open: boolean;
  onClose: () => void;
};

export function TrackAdd({ playlistId, open, onClose }: TrackAddProps) {
  const dispatch = useDispatch();

  const [title, setTitle] = useState("");
  const [url, setURL] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const playlists = useSelector((state: RootState) => state.playlists);
  const playlist = playlists.playlists.byId[playlistId];

  useEffect(() => {
    if (!open) {
      setTitle("");
      setURL("");
      setTags([]);
      setFiles([]);
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const tracks = files.length
      ? files.map((file, index) => ({
          id: uuid(),
          title:
            files.length === 1 && index === 0
              ? title
              : cleanFileName(file.name),
          url: encodeFilePath(file.path),
          tags,
        }))
      : [{ id: uuid(), title, url, tags }];
    dispatch(addTracks({ tracks, playlistId }));
    dispatch(
      addTracksToQueueIfNeeded({
        playlistId,
        trackIds: tracks.map((track) => track.id),
      }),
    );
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Tracks</DialogTitle>
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
                {files.length} tracks selected
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
          <TagInput
            label="Tags"
            helperText="Type a tag and press Enter. You can also paste #creep #tavern."
            value={tags}
            options={
              playlist ? getPlaylistTags(playlist, playlists.tracks) : []
            }
            onChange={setTags}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!files.length && (!title || !url)} type="submit">
            Add {files.length > 1 ? `${files.length} tracks` : "track"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
