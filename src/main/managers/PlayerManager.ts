import { ipcMain, BrowserWindow, webContents } from "electron";
import Fastify, { FastifyInstance } from "fastify";
import { registerRemote } from "../remote";

declare const PLAYER_WINDOW_WEBPACK_ENTRY: string;
declare const PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class PlayerManager {
  registeredViewId?: number;
  compactMode = false;
  fastify: FastifyInstance | null = null;
  address = "127.0.0.1";
  port = "3333";

  constructor() {
    ipcMain.on("PLAYER_GET_URL", this._handleGetURL);
    ipcMain.on("PLAYER_GET_PRELOAD_URL", this._handleGetPreloadURL);
    ipcMain.on("PLAYER_REGISTER_VIEW", this._handleRegisterView);
    ipcMain.on("PLAYER_SET_COMPACT_MODE", this._handleSetCompactMode);
    ipcMain.on("PLAYER_GET_COMPACT_MODE", this._handleGetCompactMode);
    ipcMain.on("PLAYER_START_REMOTE", this._handleStartRemote);
    ipcMain.on("PLAYER_STOP_REMOTE", this._handleStopRemote);
  }

  destroy() {
    ipcMain.off("PLAYER_GET_URL", this._handleGetURL);
    ipcMain.off("PLAYER_GET_PRELOAD_URL", this._handleGetPreloadURL);
    ipcMain.off("PLAYER_REGISTER_VIEW", this._handleRegisterView);
    ipcMain.off("PLAYER_SET_COMPACT_MODE", this._handleSetCompactMode);
    ipcMain.off("PLAYER_GET_COMPACT_MODE", this._handleGetCompactMode);
    ipcMain.off("PLAYER_START_REMOTE", this._handleStartRemote);
    ipcMain.off("PLAYER_STOP_REMOTE", this._handleStopRemote);
    this.stopRemote();
  }

  getView() {
    if (this.registeredViewId) {
      return webContents.fromId(this.registeredViewId);
    }
  }

  startRemote(address: string, port: string) {
    this.address = address;
    this.port = port;

    this.fastify = Fastify();

    registerRemote(this);

    this.fastify.listen(this.port, this.address, (err) => {
      const windows = BrowserWindow.getAllWindows();
      if (err) {
        for (const window of windows) {
          window.webContents.send("ERROR", err.message);
        }
        this.stopRemote();
      } else {
        for (const window of windows) {
          window.webContents.send("PLAYER_REMOTE_ENABLED", true);
        }
      }
    });
  }

  stopRemote() {
    if (this.fastify) {
      this.fastify.close();
      this.fastify = null;

      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        window.webContents.send("PLAYER_REMOTE_ENABLED", false);
      }
    }
  }

  getRemoteInfo() {
    return `Running: ${this.fastify !== null}\nAddress: ${
      this.address
    }\nPort: ${this.port}`;
  }

  _handleStartRemote = (
    _: Electron.IpcMainEvent,
    address: string,
    port: string,
  ) => this.startRemote(address, port);

  _handleStopRemote = () => this.stopRemote();

  _handleGetURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_WEBPACK_ENTRY;
  };

  _handleGetPreloadURL = (event: Electron.IpcMainEvent) => {
    event.returnValue = PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY;
  };

  _handleRegisterView = (_: Electron.IpcMainEvent, viewId: number) => {
    this.registeredViewId = viewId;
    const view = this.getView();
    const sendCompactMode = () =>
      view?.send("PLAYER_COMPACT_MODE_CHANGED", this.compactMode);
    if (view?.isLoadingMainFrame()) {
      view.once("did-finish-load", sendCompactMode);
    } else {
      sendCompactMode();
    }
  };

  _handleSetCompactMode = (_: Electron.IpcMainEvent, enabled: boolean) => {
    this.compactMode = enabled === true;
    this.getView()?.send("PLAYER_COMPACT_MODE_CHANGED", this.compactMode);
  };

  _handleGetCompactMode = (event: Electron.IpcMainEvent) => {
    event.returnValue = this.compactMode;
  };
}
