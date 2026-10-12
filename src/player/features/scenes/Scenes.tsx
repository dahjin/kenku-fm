import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SceneTabs } from "./SceneTabs";
import { ImageSelector } from "../../common/ImageSelector";
import { getRandomBackground } from "../../backgrounds";
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Add from "@mui/icons-material/AddRounded";
import Back from "@mui/icons-material/ChevronLeftRounded";
import More from "@mui/icons-material/MoreHorizRounded";
import Play from "@mui/icons-material/PlayArrowRounded";
import Music from "@mui/icons-material/MusicNoteRounded";
import Ambience from "@mui/icons-material/WavesRounded";
import Random from "@mui/icons-material/ShuffleRounded";
import Close from "@mui/icons-material/CloseRounded";
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
import { getFilteredTracks } from "../playlists/playlistTags";
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
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
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
export function Scenes() {
  const dispatch = useDispatch();
  const compact = useCompactMode();
  const density = useDisplayDensity();
  const scenes = useSelector((state: RootState) => state.scenes);
  const active = useSelector((state: RootState) => state.scenePlayback.active);
  const playlists = useSelector((state: RootState) => state.playlists);
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const [params] = useSearchParams();
  const [artworkOpen, setArtworkOpen] = useState(false);
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
  const matches = playlist
    ? getFilteredTracks(
        { ...playlist, tagFilter: tab.music.tags },
        playlists.tracks,
      ).length
    : 0;
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
        pt: compact ? 1.5 : 3,
        pb: `${density.contentClearance}px`,
      }}
    >
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
            sx={{ position: { md: "sticky" }, top: 16 }}
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
              sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
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
                <Box
                  sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: "background.default",
                    py: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 140 }}>
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
                </Box>
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
                  sx={{ pb: 1 }}
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
                    color="text.secondary"
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
                  <Section title="Music" icon={<Music />}>
                    <Stack spacing={2}>
                      <TextField
                        select
                        size="small"
                        label="Playlist"
                        value={tab.music?.playlistId ?? ""}
                        onChange={(e) =>
                          update({
                            music: e.target.value
                              ? {
                                  playlistId: e.target.value,
                                  tags: [],
                                  volume: tab.music?.volume ?? 1,
                                }
                              : undefined,
                          })
                        }
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
