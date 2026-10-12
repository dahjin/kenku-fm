import { Static, Type } from "@sinclair/typebox";
import { FastifyPluginCallback, FastifyReply } from "fastify";
import type { PlayerManager } from "../../managers/PlayerManager";
import { REMOTE_API_VERSION, RemoteSnapshot } from "../../../types/remote";

const VIEW_ERROR = {
  statusCode: 503,
  error: "Service Unavailable",
  message: "Unable to connect to Kenku FM",
};

const IdParams = Type.Object({ id: Type.String({ minLength: 1 }) });
type IdParamsType = Static<typeof IdParams>;

const SceneParams = Type.Object({
  sceneId: Type.String({ minLength: 1 }),
  tabId: Type.String({ minLength: 1 }),
});
type SceneParamsType = Static<typeof SceneParams>;

const TagsBody = Type.Object({
  tags: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
});
type TagsBodyType = Static<typeof TagsBody>;

const MuteBody = Type.Object({ mute: Type.Boolean() });
type MuteBodyType = Static<typeof MuteBody>;

const VolumeBody = Type.Object({
  volume: Type.Number({ minimum: 0, maximum: 1 }),
});
type VolumeBodyType = Static<typeof VolumeBody>;

const SeekBody = Type.Object({ to: Type.Number({ minimum: 0 }) });
type SeekBodyType = Static<typeof SeekBody>;

const ShuffleBody = Type.Object({ shuffle: Type.Boolean() });
type ShuffleBodyType = Static<typeof ShuffleBody>;

const RepeatBody = Type.Object({
  repeat: Type.Union([
    Type.Literal("off"),
    Type.Literal("track"),
    Type.Literal("playlist"),
  ]),
});
type RepeatBodyType = Static<typeof RepeatBody>;

function currentSnapshot(
  manager: PlayerManager,
  reply: FastifyReply,
): RemoteSnapshot | undefined {
  if (!manager.getView()) {
    reply.status(503).send(VIEW_ERROR);
    return undefined;
  }
  const snapshot = manager.getRemoteSnapshot();
  if (!snapshot) {
    reply.status(503).send({
      ...VIEW_ERROR,
      message: "Kenku Player state is still loading",
    });
    return undefined;
  }
  return snapshot;
}

function accepted(reply: FastifyReply) {
  reply.status(200).send({ ok: true });
}

function missing(reply: FastifyReply, resource: string, id: string) {
  reply.status(404).send({
    statusCode: 404,
    error: "Not Found",
    message: `${resource} '${id}' was not found`,
  });
}

export const v2: (manager: PlayerManager) => FastifyPluginCallback =
  (manager) => (fastify, _, done) => {
    fastify.get("/", (_, reply) => {
      reply.send({
        apiVersion: REMOTE_API_VERSION,
        resources: ["library", "state", "events"],
        controls: [
          "playlist playback",
          "playlist tags",
          "sounds",
          "sound groups",
          "scenes",
        ],
      });
    });

    fastify.get("/library", (_, reply) => {
      const snapshot = currentSnapshot(manager, reply);
      if (!snapshot) return;
      const { apiVersion, sequence, updatedAt, library } = snapshot;
      reply.send({ apiVersion, sequence, updatedAt, ...library });
    });

    fastify.get("/state", (_, reply) => {
      const snapshot = currentSnapshot(manager, reply);
      if (!snapshot) return;
      const { apiVersion, sequence, updatedAt, state } = snapshot;
      reply.send({ apiVersion, sequence, updatedAt, ...state });
    });

    fastify.get("/events", (request, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      reply.raw.flushHeaders();
      manager.addRemoteEventClient(reply.raw);
      const heartbeat = setInterval(() => {
        if (!reply.raw.writableEnded) reply.raw.write(": keep-alive\n\n");
      }, 15000);
      request.raw.on("close", () => {
        clearInterval(heartbeat);
        manager.removeRemoteEventClient(reply.raw);
      });
    });

    fastify.put("/playback/resume", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PLAY");
      accepted(reply);
    });

    fastify.put("/playback/pause", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PAUSE");
      accepted(reply);
    });

    fastify.delete("/playback", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_STOP");
      accepted(reply);
    });

    fastify.post("/playback/next", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_NEXT");
      accepted(reply);
    });

    fastify.post("/playback/previous", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_PREVIOUS");
      accepted(reply);
    });

    fastify.put<{ Body: MuteBodyType }>(
      "/playback/mute",
      { schema: { body: MuteBody } },
      (request, reply) => {
        if (!currentSnapshot(manager, reply)) return;
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_MUTE", request.body.mute);
        accepted(reply);
      },
    );

    fastify.put<{ Body: VolumeBodyType }>(
      "/playback/volume",
      { schema: { body: VolumeBody } },
      (request, reply) => {
        if (!currentSnapshot(manager, reply)) return;
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_VOLUME", request.body.volume);
        accepted(reply);
      },
    );

    fastify.put<{ Body: SeekBodyType }>(
      "/playback/seek",
      { schema: { body: SeekBody } },
      (request, reply) => {
        if (!currentSnapshot(manager, reply)) return;
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_SEEK", request.body.to);
        accepted(reply);
      },
    );

    fastify.put<{ Body: ShuffleBodyType }>(
      "/playback/shuffle",
      { schema: { body: ShuffleBody } },
      (request, reply) => {
        if (!currentSnapshot(manager, reply)) return;
        manager
          .getView()
          ?.send(
            "PLAYER_REMOTE_PLAYLIST_PLAYBACK_SHUFFLE",
            request.body.shuffle,
          );
        accepted(reply);
      },
    );

    fastify.put<{ Body: RepeatBodyType }>(
      "/playback/repeat",
      { schema: { body: RepeatBody } },
      (request, reply) => {
        if (!currentSnapshot(manager, reply)) return;
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAYBACK_REPEAT", request.body.repeat);
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType }>(
      "/playlists/:id/play",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        if (
          !snapshot.library.playlists.some(({ id }) => id === request.params.id)
        )
          return missing(reply, "Playlist", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAY", request.params.id);
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType }>(
      "/tracks/:id/play",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        if (!snapshot.library.tracks.some(({ id }) => id === request.params.id))
          return missing(reply, "Track", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_PLAYLIST_PLAY", request.params.id);
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType; Body: TagsBodyType }>(
      "/playlists/:id/tags",
      { schema: { params: IdParams, body: TagsBody } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        const playlist = snapshot.library.playlists.find(
          ({ id }) => id === request.params.id,
        );
        if (!playlist) return missing(reply, "Playlist", request.params.id);
        const unknown = request.body.tags.filter(
          (tag) => !playlist.availableTags.includes(tag.toLowerCase()),
        );
        if (unknown.length) {
          reply.status(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: `Unknown playlist tags: ${unknown.join(", ")}`,
          });
          return;
        }
        manager.getView()?.send(
          "PLAYER_REMOTE_PLAYLIST_TAGS",
          playlist.id,
          request.body.tags.map((tag) => tag.toLowerCase()),
        );
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType }>(
      "/soundboards/:id/play",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        if (
          !snapshot.library.soundboards.some(
            ({ id }) => id === request.params.id,
          )
        )
          return missing(reply, "Soundboard", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_SOUNDBOARD_PLAY", request.params.id);
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType }>(
      "/sounds/:id/play",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        if (!snapshot.library.sounds.some(({ id }) => id === request.params.id))
          return missing(reply, "Sound", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_SOUNDBOARD_PLAY", request.params.id);
        accepted(reply);
      },
    );

    fastify.delete<{ Params: IdParamsType }>(
      "/sounds/:id/playback",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        if (!snapshot.library.sounds.some(({ id }) => id === request.params.id))
          return missing(reply, "Sound", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_SOUNDBOARD_STOP", request.params.id);
        accepted(reply);
      },
    );

    fastify.put<{ Params: IdParamsType }>(
      "/groups/:id/play",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        const group = snapshot.library.soundboards
          .flatMap(({ groups }) => groups)
          .find(({ id }) => id === request.params.id);
        if (!group) return missing(reply, "Sound group", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_SOUND_GROUP_START", request.params.id);
        accepted(reply);
      },
    );

    fastify.delete<{ Params: IdParamsType }>(
      "/groups/:id/playback",
      { schema: { params: IdParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        const group = snapshot.library.soundboards
          .flatMap(({ groups }) => groups)
          .find(({ id }) => id === request.params.id);
        if (!group) return missing(reply, "Sound group", request.params.id);
        manager
          .getView()
          ?.send("PLAYER_REMOTE_SOUND_GROUP_STOP", request.params.id);
        accepted(reply);
      },
    );

    fastify.put<{ Params: SceneParamsType }>(
      "/scenes/:sceneId/tabs/:tabId/activate",
      { schema: { params: SceneParams } },
      (request, reply) => {
        const snapshot = currentSnapshot(manager, reply);
        if (!snapshot) return;
        const scene = snapshot.library.scenes.find(
          ({ id }) => id === request.params.sceneId,
        );
        if (!scene) return missing(reply, "Scene", request.params.sceneId);
        if (!scene.tabs.some(({ id }) => id === request.params.tabId))
          return missing(reply, "Scene tab", request.params.tabId);
        manager
          .getView()
          ?.send(
            "PLAYER_REMOTE_SCENE_ACTIVATE",
            request.params.sceneId,
            request.params.tabId,
          );
        accepted(reply);
      },
    );

    fastify.delete("/scenes/active", (_, reply) => {
      if (!currentSnapshot(manager, reply)) return;
      manager.getView()?.send("PLAYER_REMOTE_SCENE_STOP");
      accepted(reply);
    });

    done();
  };
