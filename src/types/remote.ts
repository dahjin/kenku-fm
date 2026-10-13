import type { RepeatInterval } from "../player/features/soundboards/repeatInterval";

export const REMOTE_API_VERSION = 2 as const;

export interface RemoteTrack {
  id: string;
  title: string;
  tags: string[];
  frequency: number;
  startSeconds: number;
  endSeconds: number | null;
  crossfadeSeconds: number | null;
  lowPassHz: number | null;
  reverbMix: number;
}

export interface RemotePlaylist {
  id: string;
  title: string;
  trackIds: string[];
  availableTags: string[];
  tagFilter: string[];
  smartShuffle: boolean;
  avoidRecent: number;
  tagPriorities: Record<string, number>;
  crossfadeSeconds: number;
}

export interface RemoteSound {
  id: string;
  title: string;
  loop: boolean;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  repeatInterval: RepeatInterval | null;
  lowPassHz: number | null;
  reverbMix: number;
}

export interface RemoteSoundGroup {
  id: string;
  title: string;
  soundIds: string[];
  interval: RepeatInterval;
}

export interface RemoteSoundboard {
  id: string;
  title: string;
  soundIds: string[];
  groups: RemoteSoundGroup[];
}

export interface RemoteSceneTab {
  id: string;
  title: string;
  transitionSeconds: number;
  music?: { playlistId: string; tags: string[]; volume: number };
  sounds: { soundId: string; volume: number }[];
  groups: {
    groupId: string;
    volume: number;
    interval: RepeatInterval;
  }[];
}

export interface RemoteScene {
  id: string;
  title: string;
  tabs: RemoteSceneTab[];
}

export interface RemoteLibrary {
  playlists: RemotePlaylist[];
  tracks: RemoteTrack[];
  soundboards: RemoteSoundboard[];
  sounds: RemoteSound[];
  scenes: RemoteScene[];
}

export interface RemotePlaylistState {
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: "off" | "track" | "playlist";
  track?: {
    id: string;
    title: string;
    duration: number;
    progress: number;
  };
  playlist?: {
    id: string;
    title: string;
    tagFilter: string[];
  };
}

export interface RemoteSoundboardState {
  sounds: {
    id: string;
    title: string;
    loop: boolean;
    volume: number;
    waiting: boolean;
    duration: number;
    progress: number;
  }[];
  groups: {
    id: string;
    title: string;
    waiting: boolean;
    soundId?: string;
  }[];
}

export interface RemoteSceneState {
  sceneId: string;
  sceneTitle: string;
  tabId: string;
  tabTitle: string;
}

export interface RemoteRuntimeState {
  playlist: RemotePlaylistState;
  soundboard: RemoteSoundboardState;
  scene: RemoteSceneState | null;
}

export interface RemoteSnapshotPayload {
  library: RemoteLibrary;
  state: RemoteRuntimeState;
}

/** Renderer-to-main update; unchanged library data may be omitted. */
export interface RemoteSnapshotUpdate {
  library?: RemoteLibrary;
  state: RemoteRuntimeState;
}

export interface RemoteSnapshot extends RemoteSnapshotPayload {
  apiVersion: typeof REMOTE_API_VERSION;
  sequence: number;
  updatedAt: string;
}
