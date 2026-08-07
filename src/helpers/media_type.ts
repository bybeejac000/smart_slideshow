const VIDEO_EXTENSION_RE = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv)(\?|#|$)/i;
const VIDEO_PATH_HINT_RE = /\/video\/(playback|original|download)(\?|#|$)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSION_RE.test(url) || VIDEO_PATH_HINT_RE.test(url);
}
