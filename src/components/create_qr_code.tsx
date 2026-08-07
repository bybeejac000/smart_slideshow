import { useEffect, useRef, useState } from "react";
import Metadata, { MediaAssetLocationMetadata } from "./metadata_icons";
export function QRModal({
  url,
  onClose,
  metadata,
}: {
  url: string;
  onClose: () => void;
  metadata: MediaAssetLocationMetadata | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    const updateQrSize = () => {
      const shortestViewportEdge = Math.min(
        window.innerWidth,
        window.innerHeight,
      );
      // Keep QR at a stable proportion of the screen while avoiding extremes.
      const nextSize = Math.round(
        Math.max(160, Math.min(520, shortestViewportEdge * 0.24)),
      );
      setQrSize(nextSize);
    };

    updateQrSize();
    window.addEventListener("resize", updateQrSize);
    return () => window.removeEventListener("resize", updateQrSize);
  }, []);

  useEffect(() => {
    // Using the qrcode library via CDN — add to your index.html:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const QRCode = window.QRCode;
    if (!QRCode) return;
    canvasEl.innerHTML = "";

    new QRCode(canvasEl, {
      text: url,
      width: qrSize,
      height: qrSize,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
    return () => {
      canvasEl.innerHTML = ""; // cleanup on unmount
    };
  }, [url, qrSize]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "clamp(20px, 3vmin, 32px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Scan to open</p>
        <div ref={canvasRef} />
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#888",
            maxWidth: qrSize,
            wordBreak: "break-all",
            textAlign: "center",
          }}
        >
          {url}
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "8px 24px",
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
        {metadata && <Metadata metadata={metadata} />}
      </div>
    </div>
  );
}
