import type { RootState } from "../app/store";
import type {
  RemoteLibrary,
  RemoteRuntimeState,
  RemoteSnapshotPayload,
  RemoteSnapshotUpdate,
} from "../../types/remote";

function buildLibrary(state: RootState): RemoteLibrary {
  const playlists = state.playlists.playlists.allIds
    .map((id) => state.playlists.playlists.byId[id])
    .filter(Boolean)
    .map((playlist) => {
      const availableTags = Array.from(
        new Set(
          playlist.tracks.flatMap(
            (id) => state.playlists.tracks[id]?.tags ?? [],
          ),
        ),
      ).sort((left, right) => left.localeCompare(right));
      return {
        id: playlist.id,
        title: playlist.title,
        trackIds: [...playlist.tracks],
        availableTags,
        tagFilter: [...(playlist.tagFilter ?? [])],
        smartShuffle: playlist.smartShuffle ?? false,
        avoidRecent: playlist.avoidRecent ?? 0,
        tagPriorities: { ...(playlist.tagPriorities ?? {}) },
        crossfadeSeconds: playlist.crossfadeSeconds ?? 0,
      };
    });
  const tracks = Object.values(state.playlists.tracks).map((track) => ({
    id: track.id,
    title: track.title,
    tags: [...(track.tags ?? [])],
    frequency: track.frequency ?? 1,
    startSeconds: track.startSeconds ?? 0,
    endSeconds: track.endSeconds ?? null,
    crossfadeSeconds: track.crossfadeSeconds ?? null,
    lowPassHz: track.lowPassHz ?? null,
    reverbMix: track.reverbMix ?? 0,
  }));
  const soundboards = state.soundboards.soundboards.allIds
    .map((id) => state.soundboards.soundboards.byId[id])
    .filter(Boolean)
    .map((soundboard) => ({
      id: soundboard.id,
      title: soundboard.title,
      soundIds: [...soundboard.sounds],
      groups: (soundboard.groups ?? []).map((group) => ({
        id: group.id,
        title: group.title,
        soundIds: [...group.soundIds],
        interval: { ...group.interval },
      })),
    }));
  const sounds = Object.values(state.soundboards.sounds).map((sound) => ({
    id: sound.id,
    title: sound.title,
    loop: sound.loop,
    volume: sound.volume,
    fadeIn: sound.fadeIn,
    fadeOut: sound.fadeOut,
    startSeconds: sound.startSeconds ?? 0,
    endSeconds: sound.endSeconds ?? null,
    repeatInterval: sound.repeatInterval ? { ...sound.repeatInterval } : null,
    lowPassHz: sound.lowPassHz ?? null,
    reverbMix: sound.reverbMix ?? 0,
  }));
  const scenes = state.scenes.allIds
    .map((id) => state.scenes.byId[id])
    .filter(Boolean)
    .map((scene) => ({
      id: scene.id,
      title: scene.title,
      tabs: scene.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        transitionSeconds: tab.transitionSeconds,
        music: tab.music
          ? {
              playlistId: tab.music.playlistId,
              tags: [...tab.music.tags],
              volume: tab.music.volume,
            }
          : undefined,
        sounds: tab.sounds.map((sound) => ({ ...sound })),
        groups: tab.groups.map((group) => ({
          ...group,
          interval: { ...group.interval },
        })),
      })),
    }));
  return { playlists, tracks, soundboards, sounds, scenes };
}

function buildRuntimeState(state: RootState): RemoteRuntimeState {
  const playback = state.playlistPlayback;
  const playlist = playback.queue
    ? state.playlists.playlists.byId[playback.queue.playlistId]
    : undefined;
  const track =
    playback.track && playback.playback
      ? {
          id: playback.track.id,
          title: playback.track.title,
          duration: playback.playback.duration,
          progress: playback.playback.progress,
        }
      : undefined;
  const active = state.scenePlayback.active;
  return {
    playlist: {
      playing: playback.playing,
      volume: playback.volume,
      muted: playback.muted,
      shuffle: playback.shuffle,
      repeat: playback.repeat,
      track,
      playlist: playlist
        ? {
            id: playlist.id,
            title: playlist.title,
            tagFilter: [...(playlist.tagFilter ?? [])],
          }
        : undefined,
    },
    soundboard: {
      sounds: Object.values(state.soundboardPlayback.playback).map((sound) => ({
        id: sound.id,
        title: sound.title,
        loop: sound.loop,
        volume: sound.volume,
        waiting: sound.waiting ?? false,
        duration: sound.duration,
        progress: sound.progress,
      })),
      groups: Object.entries(state.soundboardPlayback.groups).map(
        ([id, group]) => ({ id, ...group }),
      ),
    },
    scene: active
      ? {
          sceneId: active.sceneId,
          sceneTitle: active.sceneTitle,
          tabId: active.tab.id,
          tabTitle: active.tab.title,
        }
      : null,
  };
}

let cachedLibrary:
  | {
      playlists: RootState["playlists"];
      soundboards: RootState["soundboards"];
      scenes: RootState["scenes"];
      value: RemoteLibrary;
    }
  | undefined;

function currentLibrary(state: RootState): RemoteLibrary {
  if (
    cachedLibrary?.playlists === state.playlists &&
    cachedLibrary.soundboards === state.soundboards &&
    cachedLibrary.scenes === state.scenes
  )
    return cachedLibrary.value;
  const value = buildLibrary(state);
  cachedLibrary = {
    playlists: state.playlists,
    soundboards: state.soundboards,
    scenes: state.scenes,
    value,
  };
  return value;
}

/** Creates the public remote snapshot without local media or artwork paths. */
export function createRemoteSnapshot(state: RootState): RemoteSnapshotPayload {
  return {
    library: currentLibrary(state),
    state: buildRuntimeState(state),
  };
}

/** Omits the library when referentially unchanged since the last publish. */
export function createRemoteSnapshotUpdate(
  snapshot: RemoteSnapshotPayload,
  previousLibrary?: RemoteLibrary,
): RemoteSnapshotUpdate {
  return snapshot.library === previousLibrary
    ? { state: snapshot.state }
    : snapshot;
}
