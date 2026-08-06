import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { spawn, ChildProcess, execSync } from "node:child_process";
import { existsSync } from "node:fs";

import {
  registerProtocols,
  registerSchemesAsPrivileged,
} from "./media-protocol";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProcess: ChildProcess | null = null;
let redisProcess: ChildProcess | null = null;

const isWindows = process.platform === "win32";

const devBinDir = path.join(__dirname, "../build");
const preferredBinaryExt = isWindows ? ".exe" : "";

function resolveBinaryName(baseName: string, binDir: string): string {
  const preferred = `${baseName}${preferredBinaryExt}`;
  const alternate = preferredBinaryExt === ".exe" ? baseName : `${baseName}.exe`;

  if (existsSync(path.join(binDir, preferred))) {
    return preferred;
  }

  if (existsSync(path.join(binDir, alternate))) {
    return alternate;
  }

  return preferred;
}

function killExistingRedis() {
  if (!isWindows) {
    return;
  }

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
  return new Promise((resolve, reject) => {
    const redisDir = app.isPackaged ? process.resourcesPath : devBinDir;
    const redisBinary = resolveBinaryName("redis-server", redisDir);
    const redisPath = app.isPackaged
      ? path.join(process.resourcesPath, redisBinary)
      : path.join(devBinDir, redisBinary);

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

    redisProcess.on("error", (err) => {
      reject(new Error(`Failed to start Redis at ${redisPath}: ${err.message}`));
    });

    redisProcess.on("exit", (code) =>
      console.log(`[redis] exited with code ${code}`),
    );
  });
}

async function startBackend() {
  return new Promise<void>((resolve, reject) => {
    if (isWindows) {
      try {
        execSync(
          "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :8080') do taskkill /PID %a /F",
          { shell: "cmd.exe" },
        );
      } catch {
        // no process found, that's fine
      }
    }
    const backendDir = app.isPackaged ? process.resourcesPath : devBinDir;
    const backendBinary = resolveBinaryName("backend", backendDir);
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, backendBinary)
      : path.join(devBinDir, backendBinary);

    backendProcess = spawn(backendPath, [], {
      stdio: "pipe",
      cwd: app.isPackaged ? process.resourcesPath : devBinDir,
      env: { ...process.env },
    });

    backendProcess.stderr?.on("data", (data) => {
      console.log(`[go] ${data}`);
      if (
        data.toString().includes("server is listening") ||
        data.toString().includes("Server initialized")
      ) {
        resolve();
      }
    });

    backendProcess.stderr?.on("data", (data) =>
      console.error(`[go-error] ${data}`),
    );

    backendProcess.on("error", (err) => {
      reject(
        new Error(`Failed to start backend at ${backendPath}: ${err.message}`),
      );
    });

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
}).catch((err) => {
  console.error("Startup failed:", err);
  app.quit();
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
