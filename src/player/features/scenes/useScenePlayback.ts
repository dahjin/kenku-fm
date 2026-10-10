import { useEffect, useRef } from "react";
import { useSelector, useStore } from "react-redux";
import type { RootState } from "../../app/store";
import type { usePlaylistPlayback } from "../playlists/usePlaylistPlayback";
import type { useSoundboardPlayback } from "../soundboards/useSoundboardPlayback";
import { SceneController } from "./SceneController";

export function useScenePlayback(
  music: ReturnType<typeof usePlaylistPlayback>,
  sounds: ReturnType<typeof useSoundboardPlayback>,
) {
  const store = useStore<RootState>();
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const controller = useRef<SceneController>();
  if (!controller.current)
    controller.current = new SceneController({
      state: store.getState,
      dispatch: store.dispatch,
      music,
      sounds,
    });
  useEffect(() => {
    controller.current.apply(active);
  }, [active]);
}
