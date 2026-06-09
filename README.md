# Smart Slideshow

A full-screen desktop photo slideshow built with **Electron**, **React**, **TypeScript**, and **Vite**. Point it at a folder of images and it cycles through them with fade transitions and keyboard controls.

## Features

- Full-screen, frameless, black-background slideshow
- Auto-advance with a configurable interval (default 6s)
- Keyboard controls:
  - `→` next photo
  - `←` previous photo
  - `Space` pause / resume
  - `Esc` quit
- Reads `.jpg`, `.jpeg`, `.png`, and `.webp` files from a folder you choose

## Prerequisites

- [Node.js](https://nodejs.org/) (see `.nvmrc` / your version manager)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure which folder of photos to display
cp .env.example .env
# then edit .env and set PHOTOS_PATH to an absolute folder path
```

## Running in development

The app runs as two processes — the Vite dev server (renderer) and Electron
(main process). Start them in two terminals:

```bash
# Terminal 1 — start the Vite dev server
pnpm dev

# Terminal 2 — launch Electron once the dev server is up
pnpm electron:dev
```

## Building a distributable

```bash
pnpm build
```

This type-checks the project (`tsc -b`), bundles the renderer and Electron code
with Vite, and packages the app with `electron-builder`.

## Quality checks

```bash
pnpm lint        # ESLint
pnpm typecheck   # type-check both the Electron and renderer code
```

## Project structure

```
.
├── electron/              # Electron main process (Node environment)
│   ├── main.ts            # App entry: creates the BrowserWindow
│   ├── preload.ts         # contextBridge API exposed to the renderer
│   ├── ipc.ts             # IPC handlers (main <-> renderer messaging)
│   ├── photo-library.ts   # Reads image files from PHOTOS_PATH
│   └── media-protocol.ts  # Custom `media://` protocol for local files
├── src/                   # React renderer (browser environment)
│   ├── main.tsx           # Renderer entry, mounts React
│   ├── Slideshow.tsx      # Slideshow component
│   ├── vite-env.d.ts      # Vite client types
│   └── types/
│       └── window.d.ts    # Types for the preload API on `window`
├── index.html             # Renderer HTML entry
├── vite.config.ts         # Vite + vite-plugin-electron config
├── tsconfig.json          # Solution config (references the two below)
├── tsconfig.app.json      # TypeScript config for the renderer (DOM libs)
└── tsconfig.node.json     # TypeScript config for Electron + Vite config
```

### How the pieces fit together

1. `electron/main.ts` starts Electron, registers the `media://` protocol and IPC
   handlers, then opens a frameless full-screen window.
2. The renderer (`src/main.tsx`) calls `window.photoHelper.getList()`, which is
   exposed by `electron/preload.ts` and handled in `electron/ipc.ts`.
3. `electron/photo-library.ts` scans `PHOTOS_PATH` and returns `media://` URLs.
4. `electron/media-protocol.ts` resolves those URLs to files on disk so the
   `<img>` tags in `Slideshow.tsx` can display them.

## Environment variables

| Variable      | Required | Description                                          |
| ------------- | -------- | ---------------------------------------------------- |
| `PHOTOS_PATH` | Yes      | Absolute path to the folder of photos to display.    |

See `.env.example` for a template.
