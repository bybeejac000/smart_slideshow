import type { ReactNode } from "react";
import "./metadata_icons.css";

export interface MediaAssetLocationMetadata {
  /** Unique asset identifier */
  id: string;

  /** Timestamp when the media was captured */
  fileCreatedAt: string; // e.g. ISO string
  localDateTime: string;

  /** Photographer/Owner info */
  ownerId: string;
  owner: {
    id: string;
    email: string;
    name: string;
  };

  /** Location details from EXIF */
  exifInfo?: {
    latitude?: number | null;
    longitude?: number | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    timeZone?: string | null;
    dateTimeOriginal?: string | null;
    make?: string | null;
    model?: string | null;
    lensModel?: string | null;
  } | null;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 4.9 6.2 12.2 6.5 12.5a.67.67 0 0 0 1 0C12.8 21.2 19 13.9 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v2H2V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm15 9v8a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-8h20Zm-14 3a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2H8Z" />
    </svg>
  );
}

function OwnerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.24-8 5v1h16v-1c0-2.76-3.6-5-8-5Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M9 4 7.8 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2.8L15 4H9Zm3 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" />
    </svg>
  );
}

function LensIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 3a7 7 0 0 1 4.43 1.58L12 11Zm-6.43 3.58A7 7 0 0 1 12 5v6Zm0 6.84L12 13v6a7 7 0 0 1-6.43-3.58ZM12 19v-6l4.43 4.42A7 7 0 0 1 12 19Zm6.43-3.58L13 10V5a7 7 0 0 1 5.43 10.42Z" />
    </svg>
  );
}

function MetadataPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="metadata-pill">
      <span aria-hidden className="metadata-icon">
        {icon}
      </span>
      <p className="metadata-text" title={label}>
        {label}
      </p>
    </div>
  );
}

function getLocationLabel(metadata: MediaAssetLocationMetadata): string | null {
  const city = metadata.exifInfo?.city?.trim() ?? "";
  const state = metadata.exifInfo?.state?.trim() ?? "";
  const rawCountry = metadata.exifInfo?.country?.trim() ?? "";
  const country =
    rawCountry === "United States of America" ? "USA" : rawCountry;
  const parts = [city, state, country].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function getDateLabel(metadata: MediaAssetLocationMetadata): string | null {
  const sourceDate = metadata.localDateTime || metadata.fileCreatedAt;
  if (!sourceDate) return null;

  const parsed = new Date(sourceDate);
  if (Number.isNaN(parsed.getTime())) return sourceDate;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function getOwnerLabel(metadata: MediaAssetLocationMetadata): string | null {
  const ownerName = metadata.owner?.name?.trim() ?? "";
  const ownerEmail = metadata.owner?.email?.trim() ?? "";
  const ownerId = metadata.ownerId?.trim() ?? "";

  return ownerName || ownerEmail || ownerId || null;
}

function getDeviceLabel(metadata: MediaAssetLocationMetadata): string | null {
  const make = metadata.exifInfo?.make?.trim() ?? "";
  const model = metadata.exifInfo?.model?.trim() ?? "";

  if (make && model) {
    const makeLower = make.toLowerCase();
    const modelLower = model.toLowerCase();
    if (modelLower.startsWith(makeLower)) return model;
    return `${make} ${model}`;
  }

  return make || model || null;
}

function getLensLabel(metadata: MediaAssetLocationMetadata): string | null {
  return metadata.exifInfo?.lensModel?.trim() || null;
}

const Metadata = ({ metadata }: { metadata: MediaAssetLocationMetadata }) => {
  const locationLabel = getLocationLabel(metadata);
  const dateLabel = getDateLabel(metadata);
  const ownerLabel = getOwnerLabel(metadata);
  const deviceLabel = getDeviceLabel(metadata);
  const lensLabel = getLensLabel(metadata);

  if (
    !locationLabel &&
    !dateLabel &&
    !ownerLabel &&
    !deviceLabel &&
    !lensLabel
  ) {
    return null;
  }
  console.log(metadata);

  return (
    <div className="metadata-container">
      {locationLabel ? (
        <MetadataPill icon={<PinIcon />} label={locationLabel} />
      ) : null}
      {dateLabel ? (
        <MetadataPill icon={<CalendarIcon />} label={dateLabel} />
      ) : null}
      {ownerLabel ? (
        <MetadataPill icon={<OwnerIcon />} label={ownerLabel} />
      ) : null}
      {deviceLabel ? (
        <MetadataPill icon={<CameraIcon />} label={deviceLabel} />
      ) : null}
      {lensLabel ? (
        <MetadataPill icon={<LensIcon />} label={lensLabel} />
      ) : null}
    </div>
  );
};

export default Metadata;
