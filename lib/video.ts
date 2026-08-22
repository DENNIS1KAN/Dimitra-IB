import { createHash } from "node:crypto";

// Bunny Stream helpers (SPEC §9): one library, token authentication ON.
// Playback URLs are signed server-side and expire. Bunny's embed-token
// scheme supports no session/IP binding, so within its TTL the URL is a
// bearer URL — the short TTL below is what makes a pasted link die in any
// realistic sharing scenario (M3 verify). Dev mode (no env vars) streams
// local files via /api/materials instead.

export const bunnyConfigured = () =>
  !!(process.env.BUNNY_STREAM_LIBRARY_ID && process.env.BUNNY_STREAM_TOKEN_KEY);

/**
 * Bunny embed token: SHA256_HEX(token_key + video_id + expires_unix).
 * https://docs.bunny.net/docs/stream-embed-token-authentication
 */
export function bunnyEmbedToken(tokenKey: string, videoId: string, expiresUnix: number): string {
  return createHash("sha256").update(`${tokenKey}${videoId}${expiresUnix}`).digest("hex");
}

/**
 * Signed iframe src for a Bunny-hosted video. The token only gates the
 * iframe load, so the TTL can be short — 5 minutes covers the page opening
 * its player while keeping a copied URL near-useless to share.
 */
export function signedEmbedUrl(videoId: string, ttlSeconds = 300): string {
  const library = process.env.BUNNY_STREAM_LIBRARY_ID;
  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!library || !tokenKey) throw new Error("Bunny Stream is not configured");
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = bunnyEmbedToken(tokenKey, videoId, expires);
  return `https://iframe.mediadelivery.net/embed/${library}/${videoId}?token=${token}&expires=${expires}`;
}

/**
 * Creates a video object in the Bunny library (admin upload step 1; the
 * browser then PUTs/TUS-uploads the file straight to Bunny). Returns the
 * video GUID to store as materials.storage_key.
 */
export async function createBunnyVideo(title: string): Promise<string> {
  const library = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  if (!library || !apiKey) throw new Error("Bunny Stream is not configured");
  const res = await fetch(`https://video.bunnycdn.com/library/${library}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny create video failed: ${res.status}`);
  const body = (await res.json()) as { guid: string };
  return body.guid;
}

/**
 * Presigned TUS upload signature (browser → Bunny direct upload):
 * SHA256_HEX(library_id + api_key + expiration + video_id).
 */
export function bunnyUploadSignature(
  libraryId: string,
  apiKey: string,
  videoId: string,
  expiresUnix: number,
): string {
  return createHash("sha256")
    .update(`${libraryId}${apiKey}${expiresUnix}${videoId}`)
    .digest("hex");
}
