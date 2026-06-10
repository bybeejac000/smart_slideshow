import { defineConfig, loadEnv } from "vite";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load env vars (e.g. PHOTOS_PATH) from .env files for the current mode.
  // The empty prefix ("") loads all vars, not just those prefixed with VITE_.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    build: {
      // The renderer only ever runs in Electron's bundled Chromium, so we can
      // target the latest syntax. This also enables top-level `await`, which the
      // renderer entry (src/main.tsx) uses to load photos before rendering.
      target: "esnext",
    },
    plugins: [
      react(),
      electron({
        main: {
          // Electron main process entry. Bundled to dist-electron/main.js
          // (vite-plugin-electron names the output after the entry's basename).
          entry: "electron/main.ts",
          vite: {
            // Inject ONLY the specific .env vars the main process needs.
            // Do NOT replace the whole `process.env` object — that wipes out
            // runtime vars like VITE_DEV_SERVER_URL (set by this plugin in dev),
            // which makes the app always take the production branch and try to
            // load a non-existent dist/index.html.
            define: {
              "process.env.PHOTOS_PATH": JSON.stringify(env.PHOTOS_PATH ?? ""),
              "process.env.REDIS_HOST": JSON.stringify(env.REDIS_HOST ?? ""),
              "process.env.REDIS_PORT": JSON.stringify(env.REDIS_PORT ?? ""),
              "process.env.PHOTOS_LIST_KEY": JSON.stringify(
                env.PHOTOS_LIST_KEY ?? "",
              ),
              "process.env.GO_LISTEN_HOST": JSON.stringify(
                env.GO_LISTEN_HOST ?? "",
              ),
              "process.env.GO_LISTEN_PORT": JSON.stringify(
                env.GO_LISTEN_PORT ?? "",
              ),
            },
          },
        },
        preload: {
          // Bundled to dist-electron/preload.mjs.
          input: "electron/preload.ts",
        },
        // Skip the renderer integration in test mode.
        renderer: process.env.NODE_ENV === "test" ? undefined : {},
      }),
    ],
  };
});
