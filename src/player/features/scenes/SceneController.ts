import type { RootState } from "../../app/store";
import type { ActiveScene } from "./scenesSlice";
import type { Track } from "../playlists/playlistsSlice";
import { editPlaylist } from "../playlists/playlistsSlice";
import {
  chooseSmartTrack,
  smartShuffleEnabled,
} from "../playlists/smartShuffle";
import { getFilteredTracks } from "../playlists/playlistTags";
import { adjustVolume, startQueue } from "../playlists/playlistPlaybackSlice";
import type { Sound } from "../soundboards/soundboardsSlice";
import { startGroup, stopGroup } from "../soundboards/soundboardPlaybackSlice";
import type { AnyAction } from "@reduxjs/toolkit";

type Options = {
  state: () => RootState;
  dispatch: (action: AnyAction) => unknown;
  music: {
    retainCurrent: () => void;
    play: (track: Track, seconds?: number) => void;
    fadeOut: (seconds: number) => void;
  };
  sounds: {
    has: (id: string) => boolean;
    play: (sound: Sound) => void;
    stop: (id: string, seconds?: number) => unknown;
    volume: (id: string, value: number) => void;
  };
};

/** Applies explicit activations only. Shared references retain their live players. */
export class SceneController {
  private previous?: ActiveScene;
  private musicPlaylist?: string;
  constructor(private options: Options) {}

  apply(active: ActiveScene | null) {
    const { state: read, dispatch, music, sounds } = this.options;
    const state = read();
    const tab = active?.tab;
    const transition =
      tab?.transitionSeconds ?? this.previous?.tab.transitionSeconds ?? 0;
    const wantedSounds = (tab?.sounds ?? []).filter(
      (item) => state.soundboards.sounds[item.soundId],
    );
    const availableGroups = Object.values(
      state.soundboards.soundboards.byId,
    ).flatMap((board) => board.groups ?? []);
    const wantedGroups = (tab?.groups ?? []).filter((item) =>
      availableGroups.some((group) => group.id === item.groupId),
    );
    for (const old of this.previous?.tab.sounds ?? []) {
      if (!wantedSounds.some((item) => item.soundId === old.soundId))
        sounds.stop(old.soundId, transition);
    }
    for (const old of this.previous?.tab.groups ?? []) {
      if (!wantedGroups.some((item) => item.groupId === old.groupId))
        dispatch(stopGroup(old.groupId));
    }
    for (const item of wantedSounds) {
      // Same sound in successive tabs keeps its position, including while loading.
      if (
        this.previous?.tab.sounds.some((old) => old.soundId === item.soundId) &&
        sounds.has(item.soundId)
      ) {
        sounds.volume(item.soundId, item.volume);
      } else {
        sounds.play({
          ...state.soundboards.sounds[item.soundId],
          volume: item.volume,
          loop: true,
          repeatInterval: null,
        });
      }
    }
    for (const item of wantedGroups) {
      if (!state.soundboardPlayback.groups[item.groupId]) {
        const group = availableGroups.find(
          (group) => group.id === item.groupId,
        );
        dispatch(startGroup({ id: group.id, title: group.title }));
      }
    }
    const playlist =
      tab?.music && state.playlists.playlists.byId[tab.music.playlistId];
    const matching = playlist
      ? getFilteredTracks(
          { ...playlist, tagFilter: tab.music.tags },
          state.playlists.tracks,
        )
      : [];
    if (playlist && matching.length) {
      dispatch(editPlaylist({ id: playlist.id, tagFilter: tab.music.tags }));
      dispatch(adjustVolume(tab.music.volume));
      const current = state.playlistPlayback;
      if (
        !(
          this.musicPlaylist === playlist.id &&
          current.playing &&
          current.queue?.playlistId === playlist.id &&
          matching.includes(current.track?.id)
        )
      ) {
        const id = smartShuffleEnabled(
          playlist,
          current.shuffle,
          current.repeat,
        )
          ? chooseSmartTrack(
              matching,
              state.playlists.tracks,
              playlist,
              current.recentByPlaylist?.[playlist.id],
            )
          : matching[
              current.shuffle ? Math.floor(Math.random() * matching.length) : 0
            ];
        dispatch(
          startQueue({
            playlistId: playlist.id,
            tracks: playlist.tracks,
            trackId: id,
          }),
        );
        music.play(state.playlists.tracks[id], transition);
      } else music.retainCurrent();
      this.musicPlaylist = playlist.id;
    } else {
      if (
        active ||
        (this.musicPlaylist &&
          state.playlistPlayback.queue?.playlistId === this.musicPlaylist)
      )
        music.fadeOut(transition);
      this.musicPlaylist = undefined;
    }
    this.previous = active
      ? {
          ...active,
          tab: { ...active.tab, sounds: wantedSounds, groups: wantedGroups },
        }
      : undefined;
  }
}
