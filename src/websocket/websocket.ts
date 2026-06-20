import { Dispatch, SetStateAction } from "react";

export function createWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 10;
    const retryDelay = 1000;

    function tryConnect() {
      const ws = new WebSocket("ws://localhost:8080/injectPictures");

      ws.onopen = () => resolve(ws);

      ws.onerror = () => {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryConnect, retryDelay);
        } else {
          reject(new Error("Could not connect to backend after 10 attempts"));
        }
      };
    }

    tryConnect();
  });
}

export function initializePhotoList(
  setPhotos: Dispatch<SetStateAction<string[]>>,
  retryCount: number,
) {
  (async () => {
    let attempts = 0;
    if (attempts >= retryCount) {
      console.log("Max retries reached, giving up");
      throw new Error("Failed to fetch photos after multiple attempts");
    }
    while (attempts <= retryCount) {
      console.log("Fetching photos, attempt:", attempts + 1);
      const initialPhotos = await window.photoHelper.getList();
      console.log("Got photos:", initialPhotos);

      if (initialPhotos.length === 0) {
        const host = await window.getEnvVar("GO_LISTEN_HOST");
        const port = await window.getEnvVar("GO_LISTEN_PORT");
        console.log(
          "Hitting refresh endpoint:",
          `http://${host}:${port}/refresh`,
        );
        const res = await fetch(`http://${host}:${port}/refresh`).catch((err) =>
          console.error("Failed to refresh:", err),
        );
        console.log("Refresh response:", res?.status, res?.ok);
        if (res && res.ok) {
          setTimeout(() => attempts++, 2000);
        }
      } else {
        setPhotos(initialPhotos);
        return;
      }
    }
  })();
}

export function refreshPhotos(isRefreshing: React.MutableRefObject<boolean>) {
  (async () => {
    try {
      const host = await window.getEnvVar("GO_LISTEN_HOST");
      const port = await window.getEnvVar("GO_LISTEN_PORT");
      await fetch(`http://${host}:${port}/refresh`);
    } catch (err) {
      console.error("Go refresh failed:", err);
    } finally {
      isRefreshing.current = false;
    }
  })();
}

export function refetchPhotos(
  photos: string[],
  idx: number,
  setPhotos: Dispatch<SetStateAction<string[]>>,
  setIdx: Dispatch<SetStateAction<number>>,
  isFetching: React.MutableRefObject<boolean>,
  BEHIND_BUFFER: number,
) {
  isFetching.current = true;
  (async () => {
    try {
      const newPhotos: string[] | null = await window.photoHelper.getList();

      if (!newPhotos?.length) {
        console.log("No new photos found");
        return;
      }

      const latestPhotos = photos;
      const latestIdx = idx;
      const combined = [...latestPhotos, ...newPhotos];

      const trimAmount = Math.max(0, Math.min(latestIdx - BEHIND_BUFFER));
      console.log("Trim amount:", trimAmount);
      console.log("Photos len before trim:", combined.length);
      setPhotos(trimAmount > 0 ? combined.slice(trimAmount) : combined);
      if (trimAmount > 0) setIdx((i) => Math.max(0, i - trimAmount));
    } catch (err) {
      console.error("Redis pull failed:", err);
    } finally {
      isFetching.current = false;
    }
  })();
}
