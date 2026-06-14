import { useEffect, useState, useCallback, useRef } from "react";
import styles from "./styles/styles";
import { inMemPicAmt } from "./load_env/load_env";

// ── Tuning ────────────────────────────────────────────────────────────────────
// Tell the Go backend to hit /refresh when this many photos remain ahead.
// Set higher than FETCH_THRESHOLD so Redis is warm by the time we pull from it.
const REFRESH_THRESHOLD = 30;

// Pull new photos from Redis when this many remain ahead in the local list.
const FETCH_THRESHOLD = 20;

// How many images to preload ahead of the current frame.
const PRELOAD_AHEAD = 8;

// How many photos to keep *behind* the current index (enables smooth going back).
const BEHIND_BUFFER = 8;

// Crossfade duration in milliseconds.
const FADE_MS = 200;
// ─────────────────────────────────────────────────────────────────────────────

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

  // Refs give callbacks/async functions the latest state without re-creating them.
  const photosRef = useRef(photos);
  const idxRef = useRef(idx);
  // A single pending navigation timer. Cancelling it before creating a new one
  // is what prevents rapid-click transitions from piling up.
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetching = useRef(false);
  const isRefreshing = useRef(false);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  // Preload upcoming photos so they're already in the browser cache when needed.
  useEffect(() => {
    for (let i = 1; i <= PRELOAD_AHEAD; i++) {
      const url = photos[idx + i];
      if (!url) break;
      new Image().src = url;
    }
  }, [idx, photos]);

  /**
   * Navigate to a target index with a smooth fade.
   *
   * The key fix: clear any in-flight timer before starting a new one.
   * Rapid clicks now correctly skip intermediate frames instead of
   * queuing up a chain of transitions that fire one-by-one.
   */
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
  }, [goTo]);

  const prev = useCallback(() => {
    const cur = idxRef.current;
    const total = photosRef.current.length;
    goTo(cur > 0 ? cur - 1 : total - 1);
  }, [goTo]);

  // Don't leave a dangling timer if the component unmounts.
  useEffect(
    () => () => {
      if (navTimer.current) clearTimeout(navTimer.current);
    },
    [],
  );

  // Auto-advance. Intentionally excludes photos.length from deps so adding /
  // removing photos doesn't reset the interval and cause a mid-cycle stutter.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (photosRef.current.length === 0) return;
      next();
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, next, intervalMs]);

  // Keyboard controls.
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
          setPaused((p) => !p);
          break;
        case "Escape":
          window.close();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // ── Phase 1: tell Go to repopulate Redis while we still have breathing room.
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

  // ── Phase 2: pull new photos from Redis and slide the window forward.
  useEffect(() => {
    const ahead = photos.length - idx - 1;
    if (ahead > FETCH_THRESHOLD || isFetching.current) return;

    isFetching.current = true;
    (async () => {
      try {
        const newPhotos: string[] | null = await window.photoHelper.getList();
        if (!newPhotos?.length) return;

        // Use refs for the values that matter *at resolution time*, not schedule time.
        const latestPhotos = photosRef.current;
        const latestIdx = idxRef.current;
        const combined = [...latestPhotos, ...newPhotos];

        // Trim from the front of the array, subject to two constraints:
        //   1. Never trim photos we might navigate back to (respect BEHIND_BUFFER).
        //   2. Only trim what's needed to stay within inMemPicAmt.
        const trimAmount = Math.max(
          0,
          Math.min(
            latestIdx - BEHIND_BUFFER, // constraint 1
            combined.length - inMemPicAmt, // constraint 2
          ),
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

  // TODO: Re-add WebSocket listener here when ready.
  // It should prepend incoming URLs and bump idx to compensate so the
  // currently-visible photo doesn't jump:
  //   setPhotos(prev => [...incomingLinks, ...prev]);
  //   setIdx(prev => prev + incomingLinks.length);

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
