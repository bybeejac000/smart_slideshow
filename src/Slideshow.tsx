import { useEffect, useState, useCallback, useRef } from "react";
import styles from "./styles/styles";
import { inMemPicAmt } from "./load_env/load_env";
import { createWebSocket } from "./websocket/websocket";
import { QRModal } from "./components/create_qr_code";
import { ShowPaused } from "./components/show_paused";
// ── Tuning ────────────────────────────────────────────────────────────────────
const REFRESH_THRESHOLD = 30;
const FETCH_THRESHOLD = 20;
const PRELOAD_AHEAD = 8;
const BEHIND_BUFFER = 8;
const FADE_MS = 200;
// ─────────────────────────────────────────────────────────────────────────────

interface incomingInjectPicturesMessage {
  messageType: number;
  message: string[];
}

interface SlideshowProps {
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  intervalMs?: number;
}

export default function Slideshow({
  photos,
  setPhotos,
  intervalMs = 6000,
}: SlideshowProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [showQR, setShowQR] = useState(false);

  const photosRef = useRef(photos);
  const idxRef = useRef(idx);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching = useRef(false);
  const isRefreshing = useRef(false);
  const ws = useRef<WebSocket | null>(null);
  const [intervalReset, setIntervalReset] = useState(0);

  const injectPictures = (newPictures: string[]) => {
    setPhotos((prev) => [
      ...prev.slice(0, idxRef.current + 1),
      ...newPictures,
      ...prev.slice(idxRef.current + 1),
    ]);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const socket = await createWebSocket();
      if (cancelled) return;

      ws.current = socket;

      socket.onmessage = (event) => {
        const incomingMessage: incomingInjectPicturesMessage = JSON.parse(
          event.data,
        );
        if (!incomingMessage?.message?.length) return;
        injectPictures(incomingMessage.message);
      };
    })();

    return () => {
      cancelled = true;
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  useEffect(() => {
    for (let i = 1; i <= PRELOAD_AHEAD; i++) {
      const url = photos[idx + i];
      if (!url) break;
      new Image().src = url;
    }
  }, [idx, photos]);

  const goTo = useCallback((newIdx: number) => {
    const total = photosRef.current.length;
    if (total === 0) return;
    const target = Math.max(0, Math.min(newIdx, total - 1));

    if (navTimer.current) clearTimeout(navTimer.current);

    setOpacity(0);
    navTimer.current = setTimeout(() => {
      setIdx(target);
      setOpacity(1);
      navTimer.current = null;
    }, FADE_MS);
  }, []);

  const next = useCallback(() => {
    const cur = idxRef.current;
    const total = photosRef.current.length;
    goTo(cur < total - 1 ? cur + 1 : 0);
    setIntervalReset((r) => r + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    const cur = idxRef.current;
    goTo(cur > 0 ? cur - 1 : cur);
    setIntervalReset((r) => r + 1);
  }, [goTo]);

  const handlePause = useCallback(() => {
    setPaused((p) => {
      if (p) setShowQR(false); // unpausing → close modal
      return !p;
    });
  }, []);

  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (photosRef.current.length === 0) return;
      next();
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, next, intervalMs, intervalReset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          next();
          break;
        case "ArrowLeft":
          prev();
          break;
        case " ":
          handlePause();
          break;
        case "q":
          if (paused) setShowQR((s) => !s);
          break;
        case "Escape":
          window.close();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, handlePause, paused]);

  useEffect(() => {
    const ahead = photos.length - idx - 1;
    if (ahead > REFRESH_THRESHOLD || isRefreshing.current) return;

    isRefreshing.current = true;
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
  }, [idx, photos.length]);

  useEffect(() => {
    const ahead = photos.length - idx - 1;
    if (ahead > FETCH_THRESHOLD || isFetching.current) return;

    isFetching.current = true;
    (async () => {
      try {
        const newPhotos: string[] | null = await window.photoHelper.getList();
        if (!newPhotos?.length) return;

        const latestPhotos = photosRef.current;
        const latestIdx = idxRef.current;
        const combined = [...latestPhotos, ...newPhotos];

        const trimAmount = Math.max(
          0,
          Math.min(latestIdx - BEHIND_BUFFER, combined.length - inMemPicAmt),
        );

        setPhotos(trimAmount > 0 ? combined.slice(trimAmount) : combined);
        if (trimAmount > 0) setIdx((i) => Math.max(0, i - trimAmount));
      } catch (err) {
        console.error("Redis pull failed:", err);
      } finally {
        isFetching.current = false;
      }
    })();
  }, [idx, photos.length, setPhotos]);

  useEffect(() => {
    console.log(`idx: ${idx} photos: ${photos.length}`);
  }, [idx, photos.length]);

  if (photos.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.empty}>No photos found.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {showQR && paused && (
        <QRModal url={photos[idx]} onClose={() => setShowQR(false)} />
      )}
      {paused && <ShowPaused paused={paused} />}
      <img
        src={photos[idx]}
        alt=""
        style={{
          ...styles.image,
          opacity,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      />
    </div>
  );
}
