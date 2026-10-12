import React, { useEffect } from "react";
import { useDispatch, useStore } from "react-redux";
import type { RootState } from "../app/store";
import { editPlaylist } from "../features/playlists/playlistsSlice";
import { activateScene, stopScene } from "../features/scenes/scenesSlice";
import {
  startGroup,
  stopGroup,
} from "../features/soundboards/soundboardPlaybackSlice";
import { createRemoteSnapshot } from "./remoteSnapshot";

type RemoteV2Props = {
  onPlaylistStop: () => void;
};

/** Bridges the v2 HTTP API to the player without exposing the Redux store. */
export function RemoteV2({
  onPlaylistStop,
}: RemoteV2Props): React.ReactElement | null {
  const store = useStore<RootState>();
  const dispatch = useDispatch();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const publish = () => {
      timer = undefined;
      window.player.updateRemoteSnapshot(
        createRemoteSnapshot(store.getState()),
      );
    };
    const unsubscribe = store.subscribe(() => {
      // Playback progress can update ten times per second. Two snapshots per
      // second keep remote displays responsive without repeatedly serializing
      // the full library for every progress tick.
      timer ??= setTimeout(publish, 500);
    });
    window.player.on("PLAYER_REMOTE_SNAPSHOT_REQUEST", publish);
    publish();
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      window.player.removeAllListeners("PLAYER_REMOTE_SNAPSHOT_REQUEST");
    };
  }, [store]);

  useEffect(() => {
    window.player.on("PLAYER_REMOTE_PLAYLIST_PLAYBACK_STOP", () => {
      onPlaylistStop();
    });
    window.player.on("PLAYER_REMOTE_PLAYLIST_TAGS", ([playlistId, tags]) => {
      if (store.getState().playlists.playlists.byId[playlistId])
        dispatch(editPlaylist({ id: playlistId, tagFilter: tags }));
    });
    window.player.on("PLAYER_REMOTE_SCENE_ACTIVATE", ([sceneId, tabId]) => {
      const scene = store.getState().scenes.byId[sceneId];
      const tab = scene?.tabs.find((item) => item.id === tabId);
      if (scene && tab)
        dispatch(activateScene({ sceneId, sceneTitle: scene.title, tab }));
    });
    window.player.on("PLAYER_REMOTE_SCENE_STOP", () => {
      dispatch(stopScene());
    });
    window.player.on("PLAYER_REMOTE_SOUND_GROUP_START", ([groupId]) => {
      const group = Object.values(store.getState().soundboards.soundboards.byId)
        .flatMap((soundboard) => soundboard.groups ?? [])
        .find((item) => item.id === groupId);
      if (group) dispatch(startGroup({ id: group.id, title: group.title }));
    });
    window.player.on("PLAYER_REMOTE_SOUND_GROUP_STOP", ([groupId]) => {
      dispatch(stopGroup(groupId));
    });
    return () => {
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_PLAYBACK_STOP");
      window.player.removeAllListeners("PLAYER_REMOTE_PLAYLIST_TAGS");
      window.player.removeAllListeners("PLAYER_REMOTE_SCENE_ACTIVATE");
      window.player.removeAllListeners("PLAYER_REMOTE_SCENE_STOP");
      window.player.removeAllListeners("PLAYER_REMOTE_SOUND_GROUP_START");
      window.player.removeAllListeners("PLAYER_REMOTE_SOUND_GROUP_STOP");
    };
  }, [dispatch, onPlaylistStop, store]);

  return null;
}
