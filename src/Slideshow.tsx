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
import { MediaAssetLocationMetadata } from "./components/metadata_icons";
import { fetchMetadataForPhoto } from "./helpers/fetch_metadata";
import { isVideoUrl } from "./helpers/media_type";
// ── Tuning ────────────────────────────────────────────────────────────────────
const FADE_MS = 200;
// ─────────────────────────────────────────────────────────────────────────────

interface SlideshowProps {
  photos: string[];
  idx: number;
  loading: boolean;
  setIdx: Dispatch<SetStateAction<number>>;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  intervalMs?: number;
}

export default function Slideshow({
  photos,
  idx,
  setIdx,
  loading,
  intervalMs = 6000,
}: SlideshowProps) {
  const [paused, setPaused] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [showQR, setShowQR] = useState(false);
  const photosRef = useRef(photos);
  const idxRef = useRef(idx);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [intervalReset, setIntervalReset] = useState(0);
  const [metadata, setMetadata] = useState<MediaAssetLocationMetadata | null>(
    null,
  );
  const currentUrl = photos[idx];
  const currentIsVideo = Boolean(currentUrl) && isVideoUrl(currentUrl);

  photosRef.current = photos;

  idxRef.current = idx;

  const goTo = useCallback(
    (delta: number) => {
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
    },
    [setIdx],
  );

  const next = useCallback(() => {
    goTo(+1);
    setIntervalReset((r) => r + 1);
  }, [goTo]);

  const prev = useCallback(() => {
    goTo(-1);
    setIntervalReset((r) => r + 1);
  }, [goTo]);

  const handlePause = useCallback(async () => {
    setPaused((p) => {
      if (p) {
        setShowQR(false);
        setMetadata(null);
      } // unpausing → close modal
      else {
        void fetchMetadataForPhoto(photos[idx], setMetadata);
      }
      return !p;
    });
  }, [idx, photos]);

  // Auto-advance slideshow
  useEffect(() => {
    if (paused || loading) return;
    const id = setInterval(() => {
      if (photosRef.current.length === 0) return;
      next();
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, next, intervalMs, intervalReset, loading]);

  // Keyboard navigation
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
    if (!paused) return;
    void fetchMetadataForPhoto(photos[idx], setMetadata);
  }, [idx, paused, photos]);

  useEffect(() => {
    console.log(
      `idx: ${idx} photos: ${photosRef.current.length} currentphoto ${photosRef.current[idx]}`,
    );
  }, [idx, photos.length]);

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
        <QRModal
          url={currentUrl}
          onClose={() => setShowQR(false)}
          metadata={metadata}
        />
      )}
      {paused && <ShowPaused paused={paused} />}
      {currentIsVideo ? (
        <video
          key={currentUrl}
          src={currentUrl}
          autoPlay
          muted
          loop
          playsInline
          style={{
            ...styles.video,
            opacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      ) : (
        <img
          src={currentUrl}
          alt=""
          style={{
            ...styles.image,
            opacity,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      )}
    </div>
  );
}
