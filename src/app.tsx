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
        video.muted = true;
        video.playsInline = true;

        let settled = false;
        const finalize = (ok: boolean) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (ok) onReady?.();
          else onError();
        };

        const timeoutId = window.setTimeout(() => {
          finalize(false);
        }, 12000);

        const cleanup = () => {
          window.clearTimeout(timeoutId);
          video.onloadedmetadata = null;
          video.oncanplay = null;
          video.onerror = null;
          video.onstalled = null;
          video.onabort = null;
          video.onwaiting = null;
          video.pause();
          video.src = "";
          video.load();
        };

        const markReady = () => {
          void video
            .play()
            .then(() => {
              video.pause();
              finalize(true);
            })
            .catch((err: unknown) => {
              // NotSupportedError indicates codec/container/transcode failure.
              if (
                err instanceof DOMException &&
                err.name === "NotSupportedError"
              ) {
                finalize(false);
                return;
              }

              // Autoplay policy rejections can happen even if media is decodable.
              if (
                err instanceof DOMException &&
                err.name === "NotAllowedError"
              ) {
                finalize(true);
                return;
              }

              finalize(false);
            });
        };

        video.onloadedmetadata = markReady;
        video.oncanplay = markReady;
        video.onerror = () => {
          // MEDIA_ERR_DECODE (3) and MEDIA_ERR_SRC_NOT_SUPPORTED (4) indicate unplayable media.
          const mediaErrCode = video.error?.code;
          if (mediaErrCode === 3 || mediaErrCode === 4) {
            finalize(false);
            return;
          }
          finalize(false);
        };
        video.onstalled = () => finalize(false);
        video.onabort = () => finalize(false);
        video.onwaiting = () => {
          // If waiting persists, timeout will fail this preload.
        };
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
