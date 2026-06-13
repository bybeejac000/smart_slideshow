import { useEffect, useState, useCallback, useRef } from "react";
import createWebSocket from "./websocket/websocket";
import styles from "./styles/styles";
import { validateWebsocketMessage } from "./helpers/validate_websocket_message";
import { usePreloadPhotos } from "./helpers/preload_photos";

interface SlideshowProps {
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  photosListLength: number;
  intervalMs?: number;
}

export default function Slideshow({
  photos,
  setPhotos,
  photosListLength,
  intervalMs = 6000,
}: SlideshowProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const refreshing = useRef(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    createWebSocket().then((ws) => setWs(ws));
  }, []);

  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event) => {
      const incomingLinks = validateWebsocketMessage(event.data);
      if (incomingLinks.length === 0) return;
      setPhotos((prev) => [...incomingLinks, ...prev]);
    };
  }, [ws, setPhotos]);

  const goTo = useCallback((i: number) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(i);
      setVisible(true);
    }, 300);
  }, []);

  usePreloadPhotos(photos, idx);

  const next = useCallback(() => {
    goTo((idx + 1) % photos.length);
  }, [idx, photos.length, goTo]);

  const prev = useCallback(() => {
    goTo((idx - 1 + photos.length) % photos.length);
  }, [idx, photos.length, goTo]);

  // Refresh photo list from Go when running low
  useEffect(() => {
    const remainingPhotosInList = photosListLength - idx - 1;
    if (remainingPhotosInList <= 5 && !refreshing.current) {
      refreshing.current = true;
      (async () => {
        const host = await window.getEnvVar("GO_LISTEN_HOST");
        const port = await window.getEnvVar("GO_LISTEN_PORT");
        fetch(`http://${host}:${port}/refresh`)
          .catch((err) => console.error("Failed to refresh photo list:", err))
          .finally(() => (refreshing.current = false));
      })();
    }
  }, [idx, photosListLength]);

  // Pull new photos from Redis when running low
  useEffect(() => {
    if (photos.length > 2) return;
    (async () => {
      const newPhotos = await window.photoHelper.getList();
      setPhotos((prev) => [...prev, ...newPhotos]);
    })();
  }, [photos.length, setPhotos]);

  // Auto-advance
  useEffect(() => {
    if (paused || photos.length === 0) return;
    const timer = setInterval(next, intervalMs);
    return () => clearInterval(timer);
  }, [paused, next, intervalMs, photos.length]);

  // Keyboard input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          prev();
          break;
        case " ":
          setPaused((p) => !p);
          break;
        case "Escape":
          window.close();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  if (photos.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.empty}>No photos found.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <img
        src={photos[idx]}
        style={{ ...styles.image, opacity: visible ? 1 : 0 }}
        alt=""
      />
    </div>
  );
}
