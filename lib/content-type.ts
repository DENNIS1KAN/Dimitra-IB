// Storage keys are server-generated with a known extension (lib/storage);
// one map serves both the materials route and the admin submission route.
const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

export function extensionOf(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot === -1 ? "" : key.slice(dot).toLowerCase();
}

export function contentTypeFor(key: string): string {
  return CONTENT_TYPES[extensionOf(key)] ?? "application/octet-stream";
}
