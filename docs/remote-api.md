# Remote API

Kenku FM can run an HTTP server for local automation, Stream Deck actions, and
custom remote controls. Enable it under **Settings > Remote**. The default base
URL is `http://127.0.0.1:3333`.

The compatible
[dahjin/kenku-fm-stream-deck](https://github.com/dahjin/kenku-fm-stream-deck)
plugin uses this API for scenes, playlist tags, sound groups, library-backed
selectors, and live button state. It falls back to `/v1` for legacy actions
when connected to an older Kenku FM release.

The existing `/v1` routes remain available for compatibility. New clients
should use `/v2`, which adds scenes, playlist tag filters, sound groups, a
combined runtime state, and live updates. Version 2 never returns local audio
or artwork paths.

## API review

| Capability                                                 | Existing `/v1` API                            | `/v2` API                                                            |
| ---------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| Current track, position, and playback settings             | Playlist and soundboard playback are separate | `GET /v2/state` returns playlist, soundboard, group, and scene state |
| Play, pause, seek, skip, shuffle, repeat, mute, and volume | Supported except stop                         | Supported, including stop                                            |
| Activate scenes and scene tabs                             | Missing                                       | Supported                                                            |
| Select playlist tags                                       | Missing                                       | Supported with tag validation                                        |
| Trigger sounds                                             | Supported                                     | Supported                                                            |
| Start and stop random sound groups                         | Missing                                       | Supported                                                            |
| List playlists, tracks, and soundboards                    | Supported, but replies contain local URLs     | Supported without filesystem paths                                   |
| List tags, groups, scenes, and stable IDs                  | Partial or missing                            | Supported through `GET /v2/library`                                  |
| Receive changes without polling                            | Missing                                       | Server-sent events through `GET /v2/events`                          |

## Read endpoints

### API capabilities

```http
GET /v2
```

Returns the API version and the available resource groups.

### Library

```http
GET /v2/library
```

Returns playlists, tracks, their tags and playback preferences, soundboards,
sound groups, sounds, scenes, and scene tabs. References use stable IDs. Local
media URLs and artwork paths are deliberately omitted.

```bash
curl http://127.0.0.1:3333/v2/library
```

### Runtime state

```http
GET /v2/state
```

Returns the current playlist track and progress, playback settings, active
sounds and random groups, and the active scene tab. Each reply includes a
monotonically increasing `sequence` and an ISO 8601 `updatedAt` value.

```bash
curl http://127.0.0.1:3333/v2/state
```

### Live events

```http
GET /v2/events
Accept: text/event-stream
```

This is a server-sent event stream. A new connection receives a `snapshot`
event. State changes produce `state` events, while library changes also
produce a `library` event. Comment heartbeats keep idle connections open.

```bash
curl -N http://127.0.0.1:3333/v2/events
```

Reconnect and fetch `/v2/state` if event sequence numbers skip. Clients should
ignore unknown fields and event names so later additions remain compatible.

## Playlist controls

| Method   | Path                     | JSON body                          |
| -------- | ------------------------ | ---------------------------------- |
| `PUT`    | `/v2/playlists/:id/play` | None                               |
| `PUT`    | `/v2/tracks/:id/play`    | None                               |
| `PUT`    | `/v2/playlists/:id/tags` | `{ "tags": ["creepy", "tavern"] }` |
| `PUT`    | `/v2/playback/resume`    | None                               |
| `PUT`    | `/v2/playback/pause`     | None                               |
| `DELETE` | `/v2/playback`           | None                               |
| `POST`   | `/v2/playback/next`      | None                               |
| `POST`   | `/v2/playback/previous`  | None                               |
| `PUT`    | `/v2/playback/seek`      | `{ "to": 42.5 }`                   |
| `PUT`    | `/v2/playback/volume`    | `{ "volume": 0.8 }`                |
| `PUT`    | `/v2/playback/mute`      | `{ "mute": true }`                 |
| `PUT`    | `/v2/playback/shuffle`   | `{ "shuffle": true }`              |
| `PUT`    | `/v2/playback/repeat`    | `{ "repeat": "playlist" }`         |

Tag matching is case-insensitive. A tag selection is rejected with `400 Bad
Request` when the tag is not present on any track in that playlist. Send an
empty array to clear the filter.

```bash
curl -X PUT http://127.0.0.1:3333/v2/playlists/PLAYLIST_ID/tags \
  -H 'Content-Type: application/json' \
  -d '{"tags":["creepy","tavern"]}'
```

## Sounds and random groups

| Method   | Path                       |
| -------- | -------------------------- |
| `PUT`    | `/v2/soundboards/:id/play` |
| `PUT`    | `/v2/sounds/:id/play`      |
| `DELETE` | `/v2/sounds/:id/playback`  |
| `PUT`    | `/v2/groups/:id/play`      |
| `DELETE` | `/v2/groups/:id/playback`  |

Playing a soundboard chooses one of its sounds at random. Starting a group uses
its saved sound choices and random interval. Only one sound from the group plays
at a time.

## Scenes

Activate a saved scene tab:

```http
PUT /v2/scenes/:sceneId/tabs/:tabId/activate
```

Stop the active scene and its managed layers:

```http
DELETE /v2/scenes/active
```

Use `GET /v2/library` to discover scene and tab IDs.

## Responses and errors

Accepted commands return:

```json
{ "ok": true }
```

Unknown resource IDs return `404`. Invalid request bodies and out-of-range
values return `400`. Read endpoints return `503` until the embedded player has
finished loading.

## Network safety

The remote server does not currently authenticate requests. Keep the default
`127.0.0.1` address unless every device on the network is trusted. Binding to a
LAN address allows any device that can reach the port to control playback.
