import { useEffect, useState, useCallback } from "react";

interface SlideshowProps {
  photos: string[];
  intervalMs?: number;
}

export default function Slideshow({
  photos,
  intervalMs = 6000,
}: SlideshowProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);

  const goTo = useCallback((i: number) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(i);
      setVisible(true);
    }, 300);
  }, []);

  const next = useCallback(() => {
    goTo((idx + 1) % photos.length);
  }, [idx, photos.length, goTo]);

  const prev = useCallback(() => {
    goTo((idx - 1 + photos.length) % photos.length);
  }, [idx, photos.length, goTo]);

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

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100vw",
    height: "100vh",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    transition: "opacity 0.8s ease",
  },
  empty: {
    color: "#fff",
    fontFamily: "sans-serif",
  },
};
