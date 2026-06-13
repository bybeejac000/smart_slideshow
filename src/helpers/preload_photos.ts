import { useEffect } from "react";

export function usePreloadPhotos(
  photos: string[],
  currentIdx: number,
  ahead = 2,
) {
  useEffect(() => {
    for (let i = 1; i <= ahead; i++) {
      const url = photos[(currentIdx + i) % photos.length];
      if (!url) continue;
      const img = new Image();
      img.src = url;
    }
  }, [currentIdx, photos, ahead]);
}
