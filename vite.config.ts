import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "src/apps/slideshow/main.ts",
      },
      preload: {
        input: path.join(__dirname, "src/apps/slideshow/preload.ts"),
      },
      renderer: process.env.NODE_ENV === "test" ? undefined : {},
    }),
  ],
});
