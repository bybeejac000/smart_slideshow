import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";

import {
  registerProtocols,
  registerSchemesAsPrivileged,
} from "./media-protocol";
console.log("GO_LISTEN_HOST:", process.env.GO_LISTEN_HOST);
console.log("GO_LISTEN_PORT:", process.env.GO_LISTEN_PORT);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  registerProtocols();
  createWindow();
});
app.on("window-all-closed", () => app.quit());
