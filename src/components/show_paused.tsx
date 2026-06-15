import { useEffect, useState } from "react";

export function ShowPaused({ paused }: { paused: boolean }) {
  const [visible, setVisible] = useState(false);
  const [icon, setIcon] = useState<"pause" | "play">("pause");

  useEffect(() => {
    if (paused) {
      setIcon("pause");
      setVisible(true);
    } else {
      // switch to play icon briefly, then fade out
      setIcon("play");
      const timer = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(timer);
    }
  }, [paused]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "18%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.55)",
        transition: "opacity 0.4s ease",
        opacity: !paused ? 0 : 1,
        pointerEvents: "none",
      }}
    >
      {icon === "pause" ? (
        // pause bars
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              width: 5,
              height: 24,
              background: "#fff",
              borderRadius: 2,
            }}
          />
          <div
            style={{
              width: 5,
              height: 24,
              background: "#fff",
              borderRadius: 2,
            }}
          />
        </div>
      ) : (
        // play triangle
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "12px solid transparent",
            borderBottom: "12px solid transparent",
            borderLeft: "20px solid #fff",
            marginLeft: 4,
          }}
        />
      )}
    </div>
  );
}
