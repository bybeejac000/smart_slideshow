import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { spawn, ChildProcess } from "node:child_process";
import { env } from "./load_env";

import {
  registerProtocols,
  registerSchemesAsPrivileged,
} from "./media-protocol";

console.log(process.env.PHOTOS_LIST_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProcess: ChildProcess | null = null;

function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, "backend.exe")
    : path.join(__dirname, "../electron/backend/backend.exe");

  backendProcess = spawn(backendPath, [], {
    stdio: "pipe",
    env: {
      ...process.env,
      ...env,
    },
  });

  backendProcess.stdout?.on("data", (data) => console.log(`[go] ${data}`));
  backendProcess.stderr?.on("data", (data) => console.error(`[go] ${data}`));
  backendProcess.on("exit", (code) =>
    console.log(`[go] exited with code ${code}`),
  );
}

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: false,
    frame: false,
    backgroundColor: "#000",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

registerIpcHandlers();
registerSchemesAsPrivileged();

app.whenReady().then(() => {
  startBackend();
  registerProtocols();
  createWindow();
});

app.on("window-all-closed", () => {
  backendProcess?.kill();
  app.quit();
});
