import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { spawn, ChildProcess, execSync } from "node:child_process";

import {
  registerProtocols,
  registerSchemesAsPrivileged,
} from "./media-protocol";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProcess: ChildProcess | null = null;
let redisProcess: ChildProcess | null = null;

function killExistingRedis() {
  try {
    execSync(
      `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${process.env.REDIS_PORT ?? "6379"}') do taskkill /PID %a /F`,
      { shell: "cmd.exe" },
    );
  } catch {
    // no process found, that's fine
  }
}
function startRedis(): Promise<void> {
  return new Promise((resolve) => {
    const redisPath = app.isPackaged
      ? path.join(process.resourcesPath, "redis-server.exe")
      : path.join(__dirname, "../electron/backend/redis-server.exe");

    redisProcess = spawn(
      redisPath,
      ["--port", process.env.REDIS_PORT ?? "6379"],
      { stdio: "pipe" },
    );

    redisProcess.stdout?.on("data", (data) => {
      console.log(`[redis] ${data}`);
      if (data.toString().includes("Ready to accept connections")) {
        resolve();
      }
    });

    redisProcess.on("exit", (code) =>
      console.log(`[redis] exited with code ${code}`),
    );
  });
}

async function startBackend() {
  return new Promise<void>((resolve) => {
    try {
      execSync(
        "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :8080') do taskkill /PID %a /F",
        { shell: "cmd.exe" },
      );
    } catch {
      // no process found, that's fine
    }
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, "backend.exe")
      : path.join(__dirname, "../electron/backend/backend.exe");

    backendProcess = spawn(backendPath, [], {
      stdio: "pipe",
      cwd: app.isPackaged
        ? process.resourcesPath
        : path.join(__dirname, "../electron/backend"),
      env: { ...process.env },
    });

    backendProcess.stderr?.on("data", (data) => {
      console.log(`[go] ${data}`);
      if (data.toString().includes("server is listening")) {
        resolve();
      }
    });

    backendProcess.stderr?.on("data", (data) =>
      console.error(`[go-error] ${data}`),
    );
    backendProcess.on("exit", (code) =>
      console.log(`[go] exited with code ${code}`),
    );
  });
}

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
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

app.whenReady().then(async () => {
  killExistingRedis();
  await startRedis();
  await startBackend();
  registerProtocols();
  createWindow();
});

app.on("window-all-closed", () => {
  backendProcess?.kill();
  redisProcess?.kill();
  app.quit();
});

app.on("before-quit", () => {
  redisProcess?.kill();
  backendProcess?.kill();
});
