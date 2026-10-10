import type React from "react";

export function acceptsFile(
  accept: React.HTMLProps<HTMLInputElement>["accept"],
  type: string,
  name: string,
) {
  if (!accept) return true;
  if (accept.endsWith("*")) {
    if (type.startsWith(accept.slice(0, -1))) return true;
    // Linux file managers may omit the MIME type or report a generic one.
    if (accept === "audio/*")
      return /\.(mp3|flac|wav|ogg|oga|m4a|aac|mp4|3gp|webm|mpeg)$/i.test(name);
    return false;
  }
  return type === accept;
}
