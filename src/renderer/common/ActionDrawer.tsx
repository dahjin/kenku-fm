import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftRounded";
import Tooltip from "@mui/material/Tooltip";
import { Toolbar, Stack, Typography, Link } from "@mui/material";
import { OutputListItems } from "../features/output/OutputListItems";
import { InputListItems } from "../features/input/InputListItems";
import { BookmarkListItems } from "../features/bookmarks/BookmarkListItems";
import { Settings } from "../features/settings/Settings";

import { RootState } from "../app/store";
import { setSidebarOpen } from "../features/settings/settingsSlice";

import icon from "../../assets/icon.svg";
import { useHideScrollbar } from "./useHideScrollbar";
import { showWindowControls } from "./showWindowControls";
import {
  getDisplayDensity,
  settingsPanelWidth,
  topBarHeight,
} from "../../common/displayDensity";

type ActionDrawerProps = {
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
};

export function ActionDrawer({
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
}: ActionDrawerProps) {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const connection = useSelector((state: RootState) => state.connection);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const restoreSettingsFocusRef = useRef(false);
  const hideScrollbar = useHideScrollbar(scrollRef);
  const sidebarOpen = settings.sidebarOpen ?? true;
  const drawerWidth = getDisplayDensity(settings.compactMode).sidebarWidth;
  let reservedWidth = sidebarOpen ? drawerWidth : 0;
  if (settingsOpen) reservedWidth = settingsPanelWidth;

  function toggleSidebar() {
    dispatch(setSidebarOpen(!sidebarOpen));
  }

  function handleOpenSettings(event: React.MouseEvent<HTMLElement>) {
    settingsTriggerRef.current = event.currentTarget;
    restoreSettingsFocusRef.current = event.detail === 0;
    onOpenSettings();
  }

  function handleCloseSettings() {
    onCloseSettings();
    if (restoreSettingsFocusRef.current) {
      requestAnimationFrame(() => settingsTriggerRef.current?.focus());
    }
    restoreSettingsFocusRef.current = false;
  }

  return (
    <Box
      id="action-drawer"
      component="nav"
      sx={{
        width: reservedWidth,
        flexShrink: 0,
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            border: "none",
            bgcolor: "background.default",
            overflowY: "initial",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 180ms ease",
          },
        }}
        open={sidebarOpen}
      >
        <Toolbar
          id="drawer-toolbar"
          sx={{
            justifyContent: showWindowControls ? "space-between" : "end",
            bgcolor: "background.paper",
            px: 1,
            WebkitAppRegion: "drag",
            height: topBarHeight,
            minHeight: `${topBarHeight}px !important`,
            maxHeight: topBarHeight,
            boxSizing: "border-box",
          }}
          disableGutters
          variant="dense"
          onDoubleClick={(e) =>
            e.target === e.currentTarget && window.kenku.toggleMaximize()
          }
        >
          {showWindowControls && (
            <Box sx={{ width: "36px", height: "36px", m: 1 }}>
              <img src={icon} />
            </Box>
          )}
          <Stack direction="row" sx={{ WebkitAppRegion: "no-drag" }}>
            <Tooltip title="Settings">
              <IconButton aria-label="Settings" onClick={handleOpenSettings}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Hide sidebar">
              <IconButton aria-label="Hide sidebar" onClick={toggleSidebar}>
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
        <Box sx={{ overflowY: "auto" }} ref={scrollRef} {...hideScrollbar}>
          <Stack>
            <BookmarkListItems />
            {settings.externalInputsEnabled && <InputListItems />}
            <OutputListItems />
            {connection.status === "disconnected" && (
              <Typography variant="caption" align="center" marginY={2}>
                Connect{" "}
                <Link
                  component="button"
                  variant="caption"
                  onClick={handleOpenSettings}
                >
                  Discord
                </Link>{" "}
                for more outputs
              </Typography>
            )}
          </Stack>
        </Box>
      </Drawer>
      <Settings open={settingsOpen} onClose={handleCloseSettings} />
    </Box>
  );
}
