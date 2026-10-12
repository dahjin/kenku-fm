import { contextBridge, ipcRenderer, webUtils } from "electron";
import {
  PlaylistPlaybackReply,
  PlaylistsReply,
  SoundboardPlaybackReply,
  SoundboardsReply,
} from "../types/player";

type Channel =
  | "PLAYER_REMOTE_PLAYLIST_GET_ALL_REQUEST"
  | "PLAYER_REMOTE_PLAYLIST_PLAY"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT"
  | "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE"
  | "PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST"
  | "PLAYER_REMOTE_SOUNDBOARD_PLAY"
  | "PLAYER_REMOTE_SOUNDBOARD_STOP"
  | "PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST"
  | "PLAYER_COMPACT_MODE_CHANGED";

const validChannels: Channel[] = [
  "PLAYER_REMOTE_PLAYLIST_GET_ALL_REQUEST",
  "PLAYER_REMOTE_PLAYLIST_PLAY",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT",
  "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE",
  "PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST",
  "PLAYER_REMOTE_SOUNDBOARD_PLAY",
  "PLAYER_REMOTE_SOUNDBOARD_STOP",
  "PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST",
  "PLAYER_COMPACT_MODE_CHANGED",
];

type ChannelArguments = {
  PLAYER_REMOTE_PLAYLIST_GET_ALL_REQUEST: [];
  PLAYER_REMOTE_PLAYLIST_PLAY: [string];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_REQUEST: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE: [boolean];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME: [number];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK: [number];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS: [];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT: ["off" | "track" | "playlist"];
  PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE: [boolean];
  PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REQUEST: [];
  PLAYER_REMOTE_SOUNDBOARD_PLAY: [string];
  PLAYER_REMOTE_SOUNDBOARD_STOP: [string];
  PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REQUEST: [];
  PLAYER_COMPACT_MODE_CHANGED: [boolean];
};

const api = {
  on: <C extends Channel>(
    channel: C,
    callback: (args: ChannelArguments[C]) => void,
  ) => {
    if (validChannels.includes(channel)) {
      const newCallback = (
        _event: Electron.IpcRendererEvent,
        ...args: unknown[]
      ) => callback(args as ChannelArguments[C]);
      ipcRenderer.on(channel, newCallback);
    }
  },
  removeAllListeners: (channel: Channel) => {
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  playlistPlaybackReply: (playback: PlaylistPlaybackReply) => {
    ipcRenderer.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPLY", playback);
  },
  soundboardPlaybackReply: (playback: SoundboardPlaybackReply) => {
    ipcRenderer.send("PLAYER_REMOTE_SOUNDBOARD_PLAYBACK_REPLY", playback);
  },
  playlistGetAllReply: (playlists: PlaylistsReply) => {
    ipcRenderer.send("PLAYER_REMOTE_PLAYLIST_GET_ALL_REPLY", playlists);
  },
  soundboardGetAllReply: (soundboards: SoundboardsReply) => {
    ipcRenderer.send("PLAYER_REMOTE_SOUNDBOARD_GET_ALL_REPLY", soundboards);
  },
  setDiscordNowPlaying: (title?: string) => {
    ipcRenderer.send("DISCORD_NOW_PLAYING", title);
  },
  getCompactMode: (): boolean => {
    return ipcRenderer.sendSync("PLAYER_GET_COMPACT_MODE");
  },
  getPathForFile: (file: File) => {
    return webUtils.getPathForFile(file);
  },
};

declare global {
  interface Window {
    player: typeof api;
  }
}

contextBridge.exposeInMainWorld("player", api);
