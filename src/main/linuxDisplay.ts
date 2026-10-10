/** Match the session's native backend, while preserving explicit overrides. */
export function shouldUseWayland(
  platform: string,
  env: {
    XDG_SESSION_TYPE?: string;
    WAYLAND_DISPLAY?: string;
    DISPLAY?: string;
  },
  hasExplicitPlatform: boolean,
): boolean {
  return (
    platform === "linux" &&
    (env.XDG_SESSION_TYPE === "wayland" || Boolean(env.WAYLAND_DISPLAY)) &&
    !hasExplicitPlatform
  );
}
