import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // 👈 function, not object
  const env = loadEnv(mode, process.cwd(), ""); // 👈 missing

  return {
    plugins: [
      react(),
      electron({
        main: {
          entry: "src/apps/slideshow/backend/main.ts",
          vite: {
            define: {
              "process.env": JSON.stringify(env),
            },
          },
        },
        preload: {
          input: path.join(__dirname, "src/apps/slideshow/backend/preload.ts"),
        },
        renderer: process.env.NODE_ENV === "test" ? undefined : {},
      }),
    ],
  };
});
