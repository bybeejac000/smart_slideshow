import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import Slideshow from "./Slideshow";

function App() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  console.log(window.getEnvVar("GO_LISTEN_HOST"));
  useEffect(() => {
    if (retryCount >= 3) {
      console.log("Max retries reached, giving up");
      return;
    }

    (async () => {
      console.log("Fetching photos, attempt:", retryCount);
      const initialPhotos = await window.photoHelper.getList();
      console.log("Got photos:", initialPhotos);

      if (initialPhotos.length === 0) {
        const host = await window.getEnvVar("GO_LISTEN_HOST");
        const port = await window.getEnvVar("GO_LISTEN_PORT");
        console.log(
          "Hitting refresh endpoint:",
          `http://${host}:${port}/refresh`,
        );
        const res = await fetch(`http://${host}:${port}/refresh`).catch((err) =>
          console.error("Failed to refresh:", err),
        );
        console.log("Refresh response:", res?.status, res?.ok);
        if (res && res.ok) {
          setTimeout(() => setRetryCount((c) => c + 1), 2000);
        }
      } else {
        setPhotos(initialPhotos);
      }
    })();
  }, [retryCount]);

  return <Slideshow photos={photos} setPhotos={setPhotos} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

export default App;
