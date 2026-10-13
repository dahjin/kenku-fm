import type { Scene } from "./scenesSlice";

export const SCENE_BACKUP_KEY = "kenku-fm-fork:scenes:v1";

export interface SceneLibrary {
  byId: Record<string, Scene>;
  allIds: string[];
}

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

function isSceneLibrary(value: unknown): value is SceneLibrary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SceneLibrary>;
  return (
    Array.isArray(candidate.allIds) &&
    candidate.allIds.every((id) => typeof id === "string") &&
    Boolean(candidate.byId) &&
    typeof candidate.byId === "object" &&
    !Array.isArray(candidate.byId)
  );
}

export function loadSceneBackup(storage: ReadStorage): SceneLibrary | undefined {
  try {
    const value = storage.getItem(SCENE_BACKUP_KEY);
    if (!value) return undefined;
    const parsed: unknown = JSON.parse(value);
    return isSceneLibrary(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveSceneBackup(storage: WriteStorage, scenes: SceneLibrary) {
  try {
    storage.setItem(SCENE_BACKUP_KEY, JSON.stringify(scenes));
  } catch {
    // The main redux-persist record remains available if this mirror fails.
  }
}

/** A valid fork backup replaces a stale scene value from the shared record. */
export function restoreSceneBackup<T extends { scenes?: SceneLibrary }>(
  persistedState: T | undefined,
  backup: SceneLibrary | undefined,
): T | undefined {
  if (!persistedState || !backup) return persistedState;
  return { ...persistedState, scenes: backup };
}
