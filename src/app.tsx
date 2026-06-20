import { StrictMode, useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import Slideshow from "./Slideshow";
import {
  createWebSocket,
  initializePhotoList,
  refetchPhotos,
  refreshPhotos,
} from "./websocket/websocket";
const REFRESH_THRESHOLD = 30;
const FETCH_THRESHOLD = 20;
const BEHIND_BUFFER = 50;
const RETRY_COUNT = 3;

interface incomingInjectPicturesMessage {
  messageType: number;
  message: string[];
}

function App() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const isRefreshing = useRef(false);
  const isFetching = useRef(false);
  const ws = useRef<WebSocket | null>(null);
  const idxRef = useRef(idx);
  const refreshedRef = useRef(false);

  idxRef.current = idx;

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
  //startup script
  useEffect(() => {
    let cancelled = false;
    initializePhotoList(setPhotos, RETRY_COUNT);

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
    if (
      photos.length - idxRef.current <= REFRESH_THRESHOLD &&
      !isRefreshing.current &&
      !refreshedRef.current
    ) {
      isRefreshing.current = true;
      refreshedRef.current = true;
      refreshPhotos(isRefreshing);
      console.log("Refresh triggered");
    }
  }, [photos, idx]);

  useEffect(() => {
    const ahead = photos.length - idxRef.current - 1;
    if (ahead <= FETCH_THRESHOLD && !isFetching.current) {
      refetchPhotos(
        photos,
        idxRef.current,
        setPhotos,
        setIdx,
        isFetching,
        BEHIND_BUFFER,
      );
      refreshedRef.current = false;
    }
  }, [photos, idx]);

  return (
    <Slideshow
      photos={photos}
      setPhotos={setPhotos}
      idx={idx}
      setIdx={setIdx}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

export default App;
