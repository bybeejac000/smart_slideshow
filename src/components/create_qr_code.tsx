import { useEffect, useRef } from "react";

export function QRModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Using the qrcode library via CDN — add to your index.html:
    // <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    if (!canvasRef.current) return;
    const QRCode = window.QRCode;
    if (!QRCode) return;
    canvasRef.current.innerHTML = "";

    new QRCode(canvasRef.current, {
      text: url,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
    return () => {
      if (canvasRef.current) canvasRef.current.innerHTML = ""; // cleanup on unmount
    };
  }, [url]);

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
          padding: 32,
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
            maxWidth: 200,
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
      </div>
    </div>
  );
}
