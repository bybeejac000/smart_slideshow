import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import styles from "./styles/styles";
import { QRModal } from "./components/create_qr_code";
import { ShowPaused } from "./components/show_paused";
import { PicturesLoading } from "./components/pictures_loading";
// ── Tuning ────────────────────────────────────────────────────────────────────
const PRELOAD_AHEAD = 10;
const FADE_MS = 200;
// ─────────────────────────────────────────────────────────────────────────────

interface SlideshowProps {
  photos: string[];
  idx: number;
  setIdx: Dispatch<SetStateAction<number>>;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  intervalMs?: number;
}

export default function Slideshow({
  photos,
  idx,
  setIdx,
  intervalMs = 6000,
}: SlideshowProps) {
  const [paused, setPaused] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const photosRef = useRef(photos);
  const idxRef = useRef(idx);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [intervalReset, setIntervalReset] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  photosRef.current = photos;

  idxRef.current = idx;

  useEffect(() => {
    const url = photos[idx + PRELOAD_AHEAD];
    if (!url) return;
    new Image().src = url;
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
    console.log(
      `idx: ${idx} photos: ${photosRef.current.length} currentphoto ${photosRef.current[idx]}`,
    );
  }, [idx, photos.length]);

  useEffect(() => {
    //Preload first one
    if (photos.length === 0 || hasLoaded.current) return;
    hasLoaded.current = true;
    const img = new Image();
    img.onload = () => setLoading(false);
    img.src = photos[0];
    //Preload images
    for (let i = 1; i <= PRELOAD_AHEAD; i++) {
      const url = photos[i];
      if (!url) break;
      new Image().src = url;
    }
    //Cleanup navtimer
    return () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    };
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
