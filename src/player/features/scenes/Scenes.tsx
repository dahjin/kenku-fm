import React, { useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { SceneTabs } from "./SceneTabs";
import { ImageSelector } from "../../common/ImageSelector";
import {
  backgrounds,
  getRandomBackground,
  isBackground,
} from "../../backgrounds";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { nanoid } from "@reduxjs/toolkit";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/AddRounded";
import Back from "@mui/icons-material/ChevronLeftRounded";
import More from "@mui/icons-material/MoreHorizRounded";
import Play from "@mui/icons-material/PlayArrowRounded";
import Pause from "@mui/icons-material/PauseRounded";
import Music from "@mui/icons-material/MusicNoteRounded";
import Ambience from "@mui/icons-material/WavesRounded";
import Random from "@mui/icons-material/ShuffleRounded";
import Close from "@mui/icons-material/CloseRounded";
import Tune from "@mui/icons-material/TuneRounded";
import type { RootState } from "../../app/store";
import {
  activateScene,
  removeScene,
  saveScene,
  moveSceneTab,
  SceneTab,
  stopScene,
} from "./scenesSlice";
import { TagFilters } from "../playlists/TagFilters";
import { getFilteredTracks, getPlaylistTags } from "../playlists/playlistTags";
import { PlaylistSettings } from "../playlists/PlaylistSettings";
import { TrackSettings } from "../playlists/TrackSettings";
import { editPlaylist, type Track } from "../playlists/playlistsSlice";
import {
  adjustVolume,
  playPause,
  startQueue,
} from "../playlists/playlistPlaybackSlice";
import { SoundSettings } from "../soundboards/SoundSettings";
import { validRepeatInterval } from "../soundboards/repeatInterval";
import { LayerPicker, SceneVolume } from "./SceneEditorControls";
import { useCompactMode, useDisplayDensity } from "../../common/CompactMode";

function newTab(title = "Day"): SceneTab {
  return { id: nanoid(), title, transitionSeconds: 2, sounds: [], groups: [] };
}

function Section({
  icon,
  title,
  count,
  onAdd,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  onAdd?: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: "rgba(255, 255, 255, 0.08)",
        bgcolor: "rgba(34, 38, 57, 0.8)",
        backgroundImage:
          "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", color: "primary.main" }}>{icon}</Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {count !== undefined && (
            <Chip
              size="small"
              label={count}
              aria-label={`${count} ${title.toLowerCase()}`}
            />
          )}
          {action}
          {onAdd && (
            <Button
              size="small"
              startIcon={<Add />}
              onClick={onAdd}
              aria-label={`Add ${title.toLowerCase()}`}
            >
              Add
            </Button>
          )}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function RemoveLayer({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <Tooltip title={`Remove ${title}`}>
      <IconButton size="small" aria-label={`Remove ${title}`} onClick={onClick}>
        <Close fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function PlayingIndicator({ title }: { title: string }) {
  return (
    <Tooltip title="Playing">
      <Box
        component="span"
        role="status"
        aria-label={`${title} is playing`}
        sx={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          bgcolor: "success.main",
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

export function Scenes({
  onPlay,
}: {
  onPlay: (track: Track, transitionSeconds?: number) => void;
}) {
  const dispatch = useDispatch();
  const compact = useCompactMode();
  const density = useDisplayDensity();
  const scenes = useSelector((state: RootState) => state.scenes);
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const playlists = useSelector((state: RootState) => state.playlists);
  const playingTrackId = useSelector(
    (state: RootState) => state.playlistPlayback.track?.id,
  );
  const playingPlaylistId = useSelector(
    (state: RootState) => state.playlistPlayback.queue?.playlistId,
  );
  const playlistPlaying = useSelector(
    (state: RootState) => state.playlistPlayback.playing,
  );
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const playingSoundIds = useSelector(
    (state: RootState) => Object.keys(state.soundboardPlayback.playback),
    shallowEqual,
  );
  const playingGroups = useSelector(
    (state: RootState) => state.soundboardPlayback.groups,
  );
  const playingSounds = useMemo(
    () => new Set(playingSoundIds),
    [playingSoundIds],
  );
  const [params] = useSearchParams();
  const [artworkOpen, setArtworkOpen] = useState(false);
  const [playlistSettingsOpen, setPlaylistSettingsOpen] = useState(false);
  const [trackSettingsId, setTrackSettingsId] = useState<string | null>(null);
  const [soundSettingsId, setSoundSettingsId] = useState<string | null>(null);
  const stickyHeader = useRef<HTMLDivElement>(null);
  const [tabHeaderStuck, setTabHeaderStuck] = useState(false);
  const [sceneId, setSceneId] = useState(
    (scenes.byId[params.get("scene")] ? params.get("scene") : undefined) ??
      active?.sceneId ??
      scenes.allIds[0] ??
      "",
  );
  const [tabId, setTabId] = useState("");
  const [deleting, setDeleting] = useState<"scene" | "tab" | null>(null);
  const [picker, setPicker] = useState<"sounds" | "groups" | null>(null);
  const [menu, setMenu] = useState<{
    element: HTMLElement;
    kind: "scene" | "tab";
  } | null>(null);
  const [naming, setNaming] = useState<{
    kind: "newScene" | "newTab" | "scene" | "tab";
    value: string;
  } | null>(null);
  const scene = scenes.byId[sceneId];
  const sceneImage = scene?.background
    ? isBackground(scene.background)
      ? backgrounds[scene.background]
      : scene.background
    : undefined;
  const tab = scene?.tabs.find((item) => item.id === tabId) ?? scene?.tabs[0];
  const groups = Object.values(soundboards.soundboards.byId).flatMap((board) =>
    (board.groups ?? []).map((group) => ({ ...group, board: board.title })),
  );
  const soundItems = Object.values(soundboards.soundboards.byId).flatMap(
    (board) =>
      board.sounds
        .filter((id) => soundboards.sounds[id])
        .map((id) => ({
          id,
          title: soundboards.sounds[id].title,
          detail: board.title,
        })),
  );
  const playlist = tab?.music && playlists.playlists.byId[tab.music.playlistId];
  const matchingTrackIds = playlist
    ? getFilteredTracks(
        { ...playlist, tagFilter: tab.music.tags },
        playlists.tracks,
      )
    : [];
  const matches = matchingTrackIds.length;
  const availableTrackTags = playlist
    ? getPlaylistTags(playlist, playlists.tracks)
    : [];
  const trackSettings = trackSettingsId
    ? playlists.tracks[trackSettingsId]
    : undefined;
  const soundSettings = soundSettingsId
    ? soundboards.sounds[soundSettingsId]
    : undefined;
  const missing =
    tab &&
    ((tab.music && !playlist) ||
      tab.sounds.some((item) => !soundboards.sounds[item.soundId]) ||
      tab.groups.some(
        (item) => !groups.some((group) => group.id === item.groupId),
      ));
  const valid =
    tab && tab.groups.every((item) => validRepeatInterval(item.interval));
  const live = active?.sceneId === sceneId && active.tab.id === tab?.id;
  const changed =
    live &&
    (JSON.stringify(active.tab) !== JSON.stringify(tab) ||
      active.sceneTitle !== scene.title);

  useEffect(() => {
    const header = stickyHeader.current;
    if (!header) {
      setTabHeaderStuck(false);
      return;
    }

    const updateStickyState = () => {
      setTabHeaderStuck(header.getBoundingClientRect().top <= 0.5);
    };
    updateStickyState();
    window.addEventListener("scroll", updateStickyState, true);
    window.addEventListener("resize", updateStickyState);
    return () => {
      window.removeEventListener("scroll", updateStickyState, true);
      window.removeEventListener("resize", updateStickyState);
    };
  }, [sceneId, tab?.id]);

  function update(changes: Partial<SceneTab>) {
    dispatch(
      saveScene({
        ...scene,
        tabs: scene.tabs.map((item) =>
          item.id === tab.id ? { ...item, ...changes } : item,
        ),
      }),
    );
  }
  function saveName(event: React.FormEvent) {
    event.preventDefault();
    const title = naming.value.trim();
    if (!title) return;
    if (naming.kind === "newScene") {
      const created = {
        id: nanoid(),
        title,
        background: getRandomBackground(),
        tabs: [newTab()],
      };
      dispatch(saveScene(created));
      setSceneId(created.id);
      setTabId(created.tabs[0].id);
    } else if (naming.kind === "newTab") {
      const created = newTab(title);
      dispatch(saveScene({ ...scene, tabs: [...scene.tabs, created] }));
      setTabId(created.id);
    } else if (naming.kind === "scene")
      dispatch(saveScene({ ...scene, title }));
    else update({ title });
    setNaming(null);
  }
  function duplicateTab() {
    const created = { ...tab, id: nanoid(), title: `${tab.title} copy` };
    dispatch(saveScene({ ...scene, tabs: [...scene.tabs, created] }));
    setTabId(created.id);
    setMenu(null);
  }
  function toggleSound(id: string) {
    update({
      sounds: tab.sounds.some((item) => item.soundId === id)
        ? tab.sounds.filter((item) => item.soundId !== id)
        : [
            ...tab.sounds,
            { soundId: id, volume: soundboards.sounds[id].volume },
          ],
    });
  }
  function toggleGroup(id: string) {
    const group = groups.find((item) => item.id === id);
    update({
      groups: tab.groups.some((item) => item.groupId === id)
        ? tab.groups.filter((item) => item.groupId !== id)
        : [
            ...tab.groups,
            { groupId: id, volume: 1, interval: { ...group.interval } },
          ],
    });
  }
  return (
    <Container
      maxWidth="lg"
      sx={{
        position: "relative",
        zIndex: 0,
        pt: compact ? 1.5 : 3,
        pb: `${density.contentClearance + (active ? 64 : 32)}px`,
      }}
    >
      {sceneImage && (
        <Box
          aria-hidden
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            backgroundImage: `linear-gradient(0deg, #ffffff44 30%, #00000088 100%), url("${sceneImage}")`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      )}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mb: compact ? 1.5 : 3 }}
      >
        <Tooltip title="Home">
          <IconButton component={RouterLink} to="/" aria-label="Home">
            <Back />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Scenes
        </Typography>
        <Button
          startIcon={<Add />}
          onClick={() => setNaming({ kind: "newScene", value: "" })}
        >
          New scene
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "200px minmax(0, 1fr)",
          },
          gap: compact ? 1.5 : 3,
          alignItems: "start",
        }}
      >
        {scenes.allIds.length > 0 && (
          <Box
            component="nav"
            aria-label="Scene library"
            sx={{
              position: { md: "sticky" },
              top: 16,
              p: 1,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 2,
              bgcolor: "rgba(34, 38, 57, 0.8)",
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 1 }}
            >
              Your scenes
            </Typography>
            <List
              sx={{
                display: { xs: "flex", md: "block" },
                overflow: "auto",
                maxHeight: { md: "65vh" },
                p: 0,
              }}
            >
              {scenes.allIds.map((id) => {
                const item = scenes.byId[id];
                const isActive = active?.sceneId === id;
                return (
                  <ListItemButton
                    key={id}
                    selected={sceneId === id}
                    onClick={() => {
                      setSceneId(id);
                      setTabId("");
                    }}
                    sx={{
                      mx: 0,
                      minWidth: { xs: 140, md: 0 },
                      flexShrink: 0,
                      gap: 1,
                    }}
                  >
                    <ListItemText
                      primary={item.title || "Untitled scene"}
                      secondary={`${item.tabs.length} ${item.tabs.length === 1 ? "tab" : "tabs"}`}
                      primaryTypographyProps={{
                        noWrap: true,
                        title: item.title,
                      }}
                    />
                    {isActive && (
                      <Chip
                        label="Live"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        )}
        {!scene ? (
          <Card
            variant="outlined"
            sx={{
              gridColumn: scenes.allIds.length ? undefined : "1 / -1",
              textAlign: "center",
              py: 7,
              px: 3,
              borderColor: "rgba(255, 255, 255, 0.08)",
              bgcolor: "rgba(34, 38, 57, 0.8)",
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
            }}
          >
            <Ambience sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
            <Typography variant="h5" gutterBottom>
              A place for every atmosphere
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ maxWidth: 440, mx: "auto", mb: 3 }}
            >
              Create Razor Bay, then give it Day, Night and Tension tabs. Share
              its sounds and set the mood for each moment.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setNaming({ kind: "newScene", value: "" })}
            >
              Create a scene
            </Button>
          </Card>
        ) : (
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography
                variant="h4"
                sx={{ flexGrow: 1, overflowWrap: "anywhere" }}
              >
                {scene.title || "Untitled scene"}
              </Typography>
              <Tooltip title="Scene options">
                <IconButton
                  aria-label="Scene options"
                  onClick={(e) =>
                    setMenu({ element: e.currentTarget, kind: "scene" })
                  }
                >
                  <More />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose a tab to edit its mix. Activate it when you’re ready to
              change the atmosphere.
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 2,
                mb: 2,
                px: 1,
                bgcolor: "rgba(34, 38, 57, 0.8)",
                backgroundImage:
                  "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
              }}
            >
              <SceneTabs
                tabs={scene.tabs}
                selected={tab?.id}
                live={active?.sceneId === scene.id ? active.tab.id : undefined}
                onSelect={setTabId}
                onReorder={(active, over) => {
                  setTabId(tab?.id ?? "");
                  dispatch(moveSceneTab({ sceneId: scene.id, active, over }));
                }}
              />
              <Tooltip title="Add tab">
                <IconButton
                  aria-label="Add tab"
                  onClick={() => setNaming({ kind: "newTab", value: "" })}
                >
                  <Add />
                </IconButton>
              </Tooltip>
            </Stack>
            {!tab && (
              <Button
                startIcon={<Add />}
                onClick={() => setNaming({ kind: "newTab", value: "" })}
              >
                Create the first tab
              </Button>
            )}
            {tab && (
              <Stack spacing={2}>
                <Paper
                  ref={stickyHeader}
                  elevation={tabHeaderStuck ? 8 : 0}
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: tabHeaderStuck
                      ? "rgb(34, 38, 57)"
                      : "rgba(34, 38, 57, 0.8)",
                    backgroundImage:
                      "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 2,
                    transition:
                      "background-color 150ms ease, box-shadow 150ms ease",
                    py: 1,
                    px: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Box
                      sx={{
                        flexGrow: 1,
                        minWidth: 140,
                        display: "flex",
                        alignItems: "baseline",
                        columnGap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {tab.title || "Untitled tab"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={changed ? "warning.main" : "text.secondary"}
                      >
                        {changed
                          ? "Saved changes · not applied yet"
                          : live
                            ? "Active preset · edits save automatically"
                            : "Editing preset · changes saved automatically"}
                      </Typography>
                    </Box>
                    <Tooltip title="Tab options">
                      <IconButton
                        aria-label="Tab options"
                        onClick={(e) =>
                          setMenu({ element: e.currentTarget, kind: "tab" })
                        }
                      >
                        <More />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      startIcon={<Play />}
                      disabled={!valid}
                      onClick={() =>
                        dispatch(
                          activateScene({
                            sceneId: scene.id,
                            sceneTitle: scene.title,
                            tab,
                          }),
                        )
                      }
                    >
                      {changed
                        ? "Apply changes"
                        : live
                          ? "Reactivate"
                          : "Activate"}
                    </Button>
                  </Stack>
                </Paper>
                {missing && (
                  <Alert severity="warning">
                    Some library items were deleted. Remove or replace them in
                    this mix.
                  </Alert>
                )}
                {!valid && (
                  <Alert severity="warning">
                    Check the random group delays before activating this tab.
                  </Alert>
                )}
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  useFlexGap
                  flexWrap="wrap"
                  sx={{
                    p: 1.5,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 2,
                    bgcolor: "rgba(34, 38, 57, 0.8)",
                    backgroundImage:
                      "linear-gradient(rgba(255, 255, 255, 0.051), rgba(255, 255, 255, 0.051))",
                  }}
                >
                  <TextField
                    size="small"
                    label="Transition"
                    type="number"
                    value={tab.transitionSeconds}
                    inputProps={{
                      min: 0,
                      max: 30,
                      step: 0.1,
                      "aria-label": "Transition seconds",
                    }}
                    InputProps={{
                      endAdornment: (
                        <Typography color="text.secondary">s</Typography>
                      ),
                    }}
                    sx={{ width: 130 }}
                    onChange={(e) =>
                      update({
                        transitionSeconds: Math.max(
                          0,
                          Math.min(30, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                  <Typography
                    variant="caption"
                    color="text.primary"
                    sx={{ flex: 1, minWidth: 160 }}
                  >
                    Music crossfades. Removed ambience fades out.
                    <br />
                    Shared sounds keep playing.
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      lg: "minmax(250px, 0.85fr) minmax(0, 1.4fr)",
                    },
                    gap: 2,
                    alignItems: "start",
                  }}
                >
                  <Section
                    title="Music"
                    icon={<Music />}
                    action={
                      playlist ? (
                        <Tooltip title="Playlist options">
                          <IconButton
                            size="small"
                            aria-label="Playlist options"
                            onClick={() => setPlaylistSettingsOpen(true)}
                          >
                            <Tune fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : undefined
                    }
                  >
                    <Stack spacing={2}>
                      <TextField
                        select
                        size="small"
                        label="Playlist"
                        value={tab.music?.playlistId ?? ""}
                        onChange={(e) => {
                          setPlaylistSettingsOpen(false);
                          setTrackSettingsId(null);
                          update({
                            music: e.target.value
                              ? {
                                  playlistId: e.target.value,
                                  tags: [],
                                  volume: tab.music?.volume ?? 1,
                                }
                              : undefined,
                          });
                        }}
                      >
                        <MenuItem value="">No music</MenuItem>
                        {tab.music && !playlist && (
                          <MenuItem value={tab.music.playlistId}>
                            Deleted playlist
                          </MenuItem>
                        )}
                        {playlists.playlists.allIds.map((id) => (
                          <MenuItem key={id} value={id}>
                            {playlists.playlists.byId[id].title}
                          </MenuItem>
                        ))}
                      </TextField>
                      {tab.music ? (
                        <>
                          <SceneVolume
                            name="Music"
                            value={tab.music.volume}
                            onChange={(volume) =>
                              update({ music: { ...tab.music, volume } })
                            }
                          />
                          <Divider />
                          {playlist && (
                            <TagFilters
                              playlist={playlist}
                              tracks={playlists.tracks}
                              selection={tab.music.tags}
                              onChange={(tags) =>
                                update({ music: { ...tab.music, tags } })
                              }
                            />
                          )}
                          <Typography
                            variant="caption"
                            color={matches ? "text.secondary" : "warning.main"}
                          >
                            {matches
                              ? `${matches} matching ${matches === 1 ? "track" : "tracks"} · all selected tags must match`
                              : "No matching tracks. Activating this tab will fade music to silence."}
                          </Typography>
                          {playlist && matchingTrackIds.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                                Tracks available to this tab
                              </Typography>
                              <Stack
                                spacing={0.5}
                                sx={{ maxHeight: 220, overflowY: "auto" }}
                              >
                                {matchingTrackIds.map((id) => {
                                  const track = playlists.tracks[id];
                                  const playing =
                                    playingTrackId === id &&
                                    playingPlaylistId === playlist.id &&
                                    playlistPlaying;
                                  return (
                                    <Stack
                                      key={id}
                                      direction="row"
                                      alignItems="center"
                                      spacing={1}
                                      sx={{ minWidth: 0 }}
                                    >
                                      <Typography
                                        variant="body2"
                                        noWrap
                                        title={track.title}
                                        sx={{ flex: 1, minWidth: 0 }}
                                      >
                                        {track.title}
                                      </Typography>
                                      {playing && (
                                        <PlayingIndicator title={track.title} />
                                      )}
                                      <Tooltip
                                        title={
                                          playing
                                            ? `Pause ${track.title}`
                                            : `Play ${track.title}`
                                        }
                                      >
                                        <IconButton
                                          size="small"
                                          aria-label={`${playing ? "Pause" : "Play"} ${track.title}`}
                                          onClick={() => {
                                            if (
                                              playingTrackId === id &&
                                              playingPlaylistId === playlist.id
                                            ) {
                                              dispatch(
                                                playPause(!playlistPlaying),
                                              );
                                              return;
                                            }
                                            dispatch(
                                              editPlaylist({
                                                id: playlist.id,
                                                tagFilter: tab.music.tags,
                                              }),
                                            );
                                            dispatch(
                                              adjustVolume(tab.music.volume),
                                            );
                                            dispatch(
                                              startQueue({
                                                tracks: [...playlist.tracks],
                                                trackId: id,
                                                playlistId: playlist.id,
                                              }),
                                            );
                                            onPlay(
                                              track,
                                              tab.transitionSeconds,
                                            );
                                          }}
                                        >
                                          {playing ? (
                                            <Pause fontSize="small" />
                                          ) : (
                                            <Play fontSize="small" />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip
                                        title={`Options for ${track.title}`}
                                      >
                                        <IconButton
                                          size="small"
                                          aria-label={`Options for ${track.title}`}
                                          onClick={() => setTrackSettingsId(id)}
                                        >
                                          <Tune fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  );
                                })}
                              </Stack>
                            </Box>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Sound effects only. Activating this tab fades the
                          music to silence.
                        </Typography>
                      )}
                    </Stack>
                  </Section>
                  <Stack spacing={2} sx={{ minWidth: 0 }}>
                    <Section
                      title="Ambience"
                      icon={<Ambience />}
                      count={tab.sounds.length}
                      onAdd={() => setPicker("sounds")}
                    >
                      {!tab.sounds.length ? (
                        <Box sx={{ py: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Build the backdrop: waves, wind, rain or a busy
                            tavern.
                          </Typography>
                          <Button
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={() => setPicker("sounds")}
                          >
                            Choose looping sounds
                          </Button>
                        </Box>
                      ) : (
                        <Stack spacing={2} divider={<Divider />}>
                          {tab.sounds.map((selected) => {
                            const source = soundboards.sounds[selected.soundId];
                            const title = source?.title ?? "Deleted sound";
                            return (
                              <Box key={selected.soundId}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      noWrap
                                      title={title}
                                      color={
                                        source ? "text.primary" : "warning.main"
                                      }
                                    >
                                      {title}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {soundItems.find(
                                        (item) => item.id === selected.soundId,
                                      )?.detail ?? "Missing from library"}
                                      {source ? " · loops continuously" : ""}
                                    </Typography>
                                  </Box>
                                  {source &&
                                    playingSounds.has(selected.soundId) && (
                                      <PlayingIndicator title={title} />
                                    )}
                                  {source && (
                                    <Button
                                      size="small"
                                      startIcon={<Tune />}
                                      onClick={() =>
                                        setSoundSettingsId(selected.soundId)
                                      }
                                    >
                                      Options
                                    </Button>
                                  )}
                                  <RemoveLayer
                                    title={title}
                                    onClick={() =>
                                      update({
                                        sounds: tab.sounds.filter(
                                          (item) =>
                                            item.soundId !== selected.soundId,
                                        ),
                                      })
                                    }
                                  />
                                </Stack>
                                {source && (
                                  <SceneVolume
                                    name={title}
                                    value={selected.volume}
                                    onChange={(volume) =>
                                      update({
                                        sounds: tab.sounds.map((item) =>
                                          item.soundId === selected.soundId
                                            ? { ...item, volume }
                                            : item,
                                        ),
                                      })
                                    }
                                  />
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      )}
                    </Section>
                    <Section
                      title="Random groups"
                      icon={<Random />}
                      count={tab.groups.length}
                      onAdd={() => setPicker("groups")}
                    >
                      {!tab.groups.length ? (
                        <Box sx={{ py: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Add occasional details, like birds calling or a
                            blacksmith’s hammer.
                          </Typography>
                          <Button
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={() => setPicker("groups")}
                          >
                            Choose sound groups
                          </Button>
                        </Box>
                      ) : (
                        <Stack spacing={2} divider={<Divider />}>
                          {tab.groups.map((selected) => {
                            const group = groups.find(
                              (item) => item.id === selected.groupId,
                            );
                            const title = group?.title ?? "Deleted group";
                            const updateGroup = (
                              changes: Partial<SceneTab["groups"][number]>,
                            ) =>
                              update({
                                groups: tab.groups.map((item) =>
                                  item.groupId === selected.groupId
                                    ? { ...item, ...changes }
                                    : item,
                                ),
                              });
                            return (
                              <Box key={selected.groupId}>
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      noWrap
                                      title={title}
                                      color={
                                        group ? "text.primary" : "warning.main"
                                      }
                                    >
                                      {title}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {group
                                        ? `${group.board} · ${group.soundIds.length} sounds`
                                        : "Missing from library"}
                                    </Typography>
                                  </Box>
                                  <RemoveLayer
                                    title={title}
                                    onClick={() =>
                                      update({
                                        groups: tab.groups.filter(
                                          (item) =>
                                            item.groupId !== selected.groupId,
                                        ),
                                      })
                                    }
                                  />
                                </Stack>
                                {group && (
                                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                                    <SceneVolume
                                      name={title}
                                      value={selected.volume}
                                      onChange={(volume) =>
                                        updateGroup({ volume })
                                      }
                                    />
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                        sx={{ mb: 0.5 }}
                                      >
                                        Member sound options
                                      </Typography>
                                      <Stack
                                        direction="row"
                                        spacing={0.5}
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{
                                          maxHeight: 112,
                                          overflowY: "auto",
                                        }}
                                      >
                                        {group.soundIds
                                          .filter(
                                            (id) => soundboards.sounds[id],
                                          )
                                          .map((id) => {
                                            const member =
                                              soundboards.sounds[id];
                                            const playing =
                                              playingGroups[group.id]
                                                ?.soundId === id;
                                            return (
                                              <Button
                                                key={id}
                                                size="small"
                                                variant="text"
                                                startIcon={<Tune />}
                                                endIcon={
                                                  playing ? (
                                                    <PlayingIndicator
                                                      title={member.title}
                                                    />
                                                  ) : undefined
                                                }
                                                onClick={() =>
                                                  setSoundSettingsId(id)
                                                }
                                              >
                                                {member.title}
                                              </Button>
                                            );
                                          })}
                                      </Stack>
                                    </Box>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      useFlexGap
                                      flexWrap="wrap"
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Wait
                                      </Typography>
                                      {(
                                        ["minSeconds", "maxSeconds"] as const
                                      ).map((field, index) => (
                                        <React.Fragment key={field}>
                                          {index > 0 && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              to
                                            </Typography>
                                          )}
                                          <TextField
                                            size="small"
                                            type="number"
                                            label={
                                              index ? "Maximum" : "Minimum"
                                            }
                                            sx={{ width: 110 }}
                                            value={selected.interval[field]}
                                            inputProps={{
                                              min: 0.1,
                                              max: 86400,
                                              step: 0.1,
                                              "aria-label": `${title} ${index ? "maximum" : "minimum"} delay seconds`,
                                            }}
                                            error={
                                              !validRepeatInterval(
                                                selected.interval,
                                              )
                                            }
                                            onChange={(e) =>
                                              updateGroup({
                                                interval: {
                                                  ...selected.interval,
                                                  [field]: Number(
                                                    e.target.value,
                                                  ),
                                                },
                                              })
                                            }
                                          />
                                        </React.Fragment>
                                      ))}
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        seconds after each sound
                                      </Typography>
                                    </Stack>
                                    {!validRepeatInterval(
                                      selected.interval,
                                    ) && (
                                      <Typography
                                        variant="caption"
                                        color="error.main"
                                      >
                                        Use 0.1–86400 seconds. Maximum must be
                                        at least minimum.
                                      </Typography>
                                    )}
                                  </Stack>
                                )}
                              </Box>
                            );
                          })}
                        </Stack>
                      )}
                    </Section>
                  </Stack>
                </Box>
              </Stack>
            )}
          </Box>
        )}
      </Box>
      {playlist && (
        <PlaylistSettings
          playlist={playlist}
          open={playlistSettingsOpen}
          onClose={() => setPlaylistSettingsOpen(false)}
        />
      )}
      {trackSettings && (
        <TrackSettings
          track={trackSettings}
          availableTags={availableTrackTags}
          open
          onClose={() => setTrackSettingsId(null)}
        />
      )}
      {soundSettings && (
        <SoundSettings
          sound={soundSettings}
          open
          onClose={() => setSoundSettingsId(null)}
        />
      )}
      <Dialog
        open={artworkOpen}
        onClose={() => setArtworkOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Scene artwork</DialogTitle>
        <DialogContent>
          {scene && (
            <ImageSelector
              value={scene.background ?? ""}
              onChange={(background) =>
                dispatch(saveScene({ ...scene, background }))
              }
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArtworkOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
      <Menu
        anchorEl={menu?.element}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          onClick={() => {
            setNaming({
              kind: menu.kind,
              value: menu.kind === "scene" ? scene.title : tab.title,
            });
            setMenu(null);
          }}
        >
          Rename {menu?.kind}
        </MenuItem>
        {menu?.kind === "scene" && (
          <MenuItem
            onClick={() => {
              setArtworkOpen(true);
              setMenu(null);
            }}
          >
            Change artwork
          </MenuItem>
        )}
        {menu?.kind === "tab" && (
          <MenuItem onClick={duplicateTab}>Duplicate tab</MenuItem>
        )}
        <Divider />
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            setDeleting(menu.kind);
            setMenu(null);
          }}
        >
          Delete {menu?.kind}
        </MenuItem>
      </Menu>
      <Dialog
        open={Boolean(naming)}
        onClose={() => setNaming(null)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={saveName}>
          <DialogTitle>
            {naming?.kind === "newScene"
              ? "New scene"
              : naming?.kind === "newTab"
                ? "New tab"
                : `Rename ${naming?.kind ?? ""}`}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="Name"
              placeholder={naming?.kind === "newScene" ? "Razor Bay" : "Night"}
              value={naming?.value ?? ""}
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNaming(null)}>Cancel</Button>
            <Button
              type="submit"
              disabled={!naming?.value.trim()}
              variant="contained"
            >
              {naming?.kind.startsWith("new") ? "Create" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {picker && tab && (
        <LayerPicker
          key={picker}
          kind={picker}
          items={
            picker === "sounds"
              ? soundItems
              : groups.map((group) => ({
                  id: group.id,
                  title: group.title,
                  detail: `${group.board} · ${group.soundIds.length} sounds`,
                }))
          }
          selected={
            picker === "sounds"
              ? tab.sounds.map((item) => item.soundId)
              : tab.groups.map((item) => item.groupId)
          }
          onToggle={picker === "sounds" ? toggleSound : toggleGroup}
          onClose={() => setPicker(null)}
        />
      )}
      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete this {deleting}?</DialogTitle>
        <DialogContent>
          <Typography>
            {(deleting === "scene" ? active?.sceneId === sceneId : live)
              ? "Its active playback will stop. "
              : ""}
            Your library sounds and playlists will remain available.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleting === "scene") {
                dispatch(removeScene(scene.id));
                setSceneId(scenes.allIds.find((id) => id !== scene.id) ?? "");
              } else {
                if (live) dispatch(stopScene());
                dispatch(
                  saveScene({
                    ...scene,
                    tabs: scene.tabs.filter((item) => item.id !== tab.id),
                  }),
                );
              }
              setTabId("");
              setDeleting(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
