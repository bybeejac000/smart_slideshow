import { useEffect, useState, useCallback, useRef } from "react";
import styles from "./styles/styles";
import { inMemPicAmt } from "./load_env/load_env";
import { createWebSocket } from "./websocket/websocket";
import { QRModal } from "./components/create_qr_code";
import { ShowPaused } from "./components/show_paused";
import { PicturesLoading } from "./components/pictures_loading";
// ── Tuning ────────────────────────────────────────────────────────────────────
const REFRESH_THRESHOLD = 30;
const FETCH_THRESHOLD = 20;
const PRELOAD_AHEAD = 20;
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
  const [loading, setLoading] = useState(true);

  const injectPictures = useCallback(
    (newPictures: string[]) => {
      setPhotos((prev) => [
        ...prev.slice(0, idxRef.current + 1),
        ...newPictures,
        ...prev.slice(idxRef.current + 1),
      ]);
    },
    [setPhotos],
  );

  //Create temps for incoming WebSocket messages that inject pictures into the slideshow
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
  }, [injectPictures]);

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

  const goTo = useCallback((delta: number) => {
    if (navTimer.current) clearTimeout(navTimer.current);
    setOpacity(0);
    navTimer.current = setTimeout(() => {
      setIdx((prev) => {
        const target = Math.max(
          0,
          Math.min(prev + delta, photosRef.current.length - 1),
        );
        return target;
      });
      setOpacity(1);
      navTimer.current = null;
    }, FADE_MS);
  }, []);
  const next = useCallback(() => {
    goTo(+1);
    setIntervalReset((r) => r + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    goTo(-1);
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
    if (paused || loading) return;
    const id = setInterval(() => {
      if (photosRef.current.length === 0) return;
      next();
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, next, intervalMs, intervalReset, loading]);

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

        if (!newPhotos?.length) {
          console.log("No new photos found");
          return;
        }

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
    console.log(
      `idx: ${idx} photos: ${photosRef.current.length} currentphoto ${photosRef.current[idx]}`,
    );
  }, [idx, photos.length]);

  useEffect(() => {
    if (photos.length === 0) return;
    const img = new Image();
    img.onload = () => setLoading(false);
    img.src = photos[idxRef.current];
  }, [photos]);

  if (photosRef.current.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.empty}>No photos found.</p>
      </div>
    );
  }

  if (loading) {
    return <PicturesLoading />;
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
