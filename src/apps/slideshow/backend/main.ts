import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerRoutes } from "../routes/routes";

import {
  registerProtocols,
  registerSchemesAsPrivileged,
} from "../helpers/media_protocol";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

registerRoutes();

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: false,
    frame: false,
    backgroundColor: "#000",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

registerSchemesAsPrivileged();

app.whenReady().then(() => {
  registerProtocols();
  createWindow();
});
app.on("window-all-closed", () => app.quit());
