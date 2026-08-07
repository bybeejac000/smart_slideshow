import { useState, useEffect, useRef, useCallback } from "react";
import Slideshow from "./Slideshow";
import {
  createWebSocket,
  initializePhotoList,
  refetchPhotos,
  refreshPhotos,
} from "./websocket/websocket";
import { isVideoUrl } from "./helpers/media_type";
const REFRESH_THRESHOLD = 30;
const FETCH_THRESHOLD = 20;
const BEHIND_BUFFER = 50;
const RETRY_COUNT = 3;
const PRELOAD_AHEAD = 10;

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
  const [loading, setLoading] = useState(true);

  const preloadUrl = useCallback(
    (url: string, onError: () => void, onReady?: () => void) => {
      if (isVideoUrl(url)) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadeddata = () => onReady?.();
        video.onerror = () => onError();
        video.src = url;
        video.load();
        return;
      }

      const img = new Image();
      img.onload = () => onReady?.();
      img.onerror = () => onError();
      img.src = url;
    },
    [],
  );

  const preloadAhead = useCallback(
    (basePhotos: string[]) => {
      for (let i = 1; i <= PRELOAD_AHEAD; i++) {
        const url = basePhotos[i];
        if (!url) break;
        preloadUrl(url, () => {
          setPhotos((prev) => prev.filter((p) => p !== url));
        });
      }
    },
    [preloadUrl],
  );

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
  }, [injectPictures]);

  useEffect(() => {
    // Refresh photos if we are within the refresh threshold and not already refreshing
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

    // Fetch more photos if we are within the fetch threshold and not already fetching
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

  useEffect(() => {
    //Preload first one
    if (photos.length === 0 || !loading) return;
    const firstUrl = photos[0];
    preloadUrl(
      firstUrl,
      () => {
        setPhotos((prev) => prev.filter((p) => p !== firstUrl));
      },
      () => {
        setLoading(false);
        preloadAhead(photos);
      },
    );
  }, [photos, loading, preloadAhead, preloadUrl]);

  useEffect(() => {
    const url = photos[idx + PRELOAD_AHEAD];
    if (!url) return;
    preloadUrl(url, () => {
      setPhotos((prev) => prev.filter((p) => p !== url));
    });
  }, [idx, photos, preloadUrl]);

  return (
    <Slideshow
      photos={photos}
      setPhotos={setPhotos}
      loading={loading}
      idx={idx}
      setIdx={setIdx}
    />
  );
}

export default App;
