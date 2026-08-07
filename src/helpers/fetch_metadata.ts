import type { Dispatch, SetStateAction } from "react";
import type { MediaAssetLocationMetadata } from "../components/metadata_icons";

export async function fetchMetadataForPhoto(
  photoUrl: string,
  setMetadata: Dispatch<SetStateAction<MediaAssetLocationMetadata | null>>,
): Promise<void> {
  const apiKey = await window.getEnvVar("IMMICH_RO_API_KEY");
  const immichUrl = await window.getEnvVar("IMMICH_URL");
  const match = photoUrl.match(/\/assets\/([0-9a-fA-F-]{36})/);
  const assetId = match ? match[1] : null;

  if (!apiKey || !immichUrl || !assetId) {
    setMetadata(null);
    return;
  }

  const metadataUrl = `${immichUrl}/api/assets/${assetId}`;
  const res = await fetch(metadataUrl, {
    headers: {
      "x-api-key": apiKey,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    setMetadata(null);
    return;
  }

  const data: MediaAssetLocationMetadata = await res.json();
  setMetadata(data);
}
