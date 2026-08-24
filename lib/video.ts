import { httpUrlOrNull } from "./validate";

// Link videos (SPEC §15.7 #25). A week's video is normally an MP4 uploaded to
// the server's own storage and served behind the login. As an alternative per
// video, the tutor can paste a link to a video she already has elsewhere
// (Loom, Google Drive, an unlisted YouTube). Pure and tested: the admin form,
// the API and the student page all read the same two functions.
//
// The honest limits of a pasted link, stated in the admin next to the field:
// it plays on that service rather than behind this login, so anyone holding
// the link can open it; it cannot be paused with a student; and nothing
// reports watch position back, so it is one Watch step, logged when opened.

export type VideoEmbed = {
  /** What to call the host in the UI: "YouTube", "Loom", "Google Drive", or the hostname. */
  provider: string;
  /** An in-page player URL, or null when the only honest offer is "Open video". */
  embedUrl: string | null;
};

/** Provider ids are opaque slugs; anything else must not reach an iframe src. */
const ID = /^[\w-]{5,64}$/;

/**
 * Accepts an absolute http(s) URL with a hostname, exactly like the settings'
 * booking_url. Everything else is refused at the door, so no `javascript:`
 * value can ever land in a student's page.
 */
export function validateVideoUrl(
  raw: unknown,
): { ok: true; url: string } | { ok: false; reason: "empty" | "invalid-url" } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "empty" };
  const url = httpUrlOrNull(raw);
  return url ? { ok: true, url } : { ok: false, reason: "invalid-url" };
}

const bare = (hostname: string) => hostname.toLowerCase().replace(/^www\./, "");

/** Segments of the path, with the empty strings dropped. */
const parts = (pathname: string) => pathname.split("/").filter(Boolean);

function youtubeId(url: URL): string | null {
  const host = bare(url.hostname);
  if (host === "youtu.be") return parts(url.pathname)[0] ?? null;
  const [first, second] = parts(url.pathname);
  if (first === "watch") return url.searchParams.get("v");
  if (first === "embed" || first === "shorts" || first === "live") return second ?? null;
  return null;
}

/**
 * How to show a pasted link. The three services the tutor was told to use get
 * an in-page player; anything else is offered as an "Open video" step rather
 * than an iframe that may quietly refuse to load.
 */
export function videoEmbed(raw: string): VideoEmbed {
  const value = httpUrlOrNull(raw);
  if (!value) return { provider: "video", embedUrl: null };
  const url = new URL(value);
  const host = bare(url.hostname);

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id = youtubeId(url);
    // youtube-nocookie serves the same player without the tracking cookie.
    return { provider: "YouTube", embedUrl: id && ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null };
  }

  if (host === "loom.com") {
    const [first, id] = parts(url.pathname);
    const usable = (first === "share" || first === "embed") && id && ID.test(id);
    return { provider: "Loom", embedUrl: usable ? `https://www.loom.com/embed/${id}` : null };
  }

  if (host === "drive.google.com") {
    const [first, second, id] = parts(url.pathname);
    const usable = first === "file" && second === "d" && id && ID.test(id);
    return { provider: "Google Drive", embedUrl: usable ? `https://drive.google.com/file/d/${id}/preview` : null };
  }

  return { provider: host, embedUrl: null };
}
