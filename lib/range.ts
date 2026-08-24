// HTTP Range parsing for the material bytes route (SPEC §15.7 #25). Pure and
// tested, because video seeking is the one place where a wrong byte offset is
// invisible in the UI and only shows up as a stalled player.
//
// The route serves a single stored object, so it answers single-range requests
// only. Anything else the client can send is either "give me everything"
// (no header) or a request we refuse with 416 plus `Content-Range: bytes */N`,
// which tells the client the real size so its next attempt can be correct.

export type RangeRequest =
  | { kind: "full" }
  | { kind: "unsatisfiable" }
  | { kind: "slice"; start: number; end: number };

const FULL: RangeRequest = { kind: "full" };
const NOPE: RangeRequest = { kind: "unsatisfiable" };

/** Digits only, and small enough to stay an exact integer. */
function digits(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Resolve a Range header against a known object size.
 *
 * Absent or blank header → `full` (serve 200 with the whole object).
 * A header we cannot satisfy exactly once → `unsatisfiable` (416). That covers
 * junk ("bytes=abc"), the wrong unit, multi-range requests we will not answer
 * as multipart, a zero-length suffix, and a start past the end of the object.
 */
export function parseRangeHeader(header: string | null | undefined, size: number): RangeRequest {
  if (header == null) return FULL;
  const value = header.trim();
  if (!value) return FULL;

  const spec = value.toLowerCase().startsWith("bytes=") ? value.slice(6).trim() : null;
  // Wrong unit, or no "bytes=" at all: nothing here we can honour.
  if (spec === null) return NOPE;
  // One range per request: we serve a single body, never multipart/byteranges.
  if (spec.includes(",")) return NOPE;

  const dash = spec.indexOf("-");
  if (dash === -1) return NOPE;
  const left = spec.slice(0, dash).trim();
  const right = spec.slice(dash + 1).trim();

  // An empty object has no byte to hand back, whatever was asked for.
  if (size <= 0) return NOPE;

  // Suffix form "-N": the last N bytes.
  if (left === "") {
    const suffix = digits(right);
    if (suffix === null || suffix === 0) return NOPE;
    return { kind: "slice", start: Math.max(0, size - suffix), end: size - 1 };
  }

  const start = digits(left);
  if (start === null || start >= size) return NOPE;

  // Open-ended "N-": from N to the end.
  if (right === "") return { kind: "slice", start, end: size - 1 };

  const asked = digits(right);
  if (asked === null || asked < start) return NOPE;
  return { kind: "slice", start, end: Math.min(asked, size - 1) };
}

/** The 416 body-less answer's header: the client learns the true size. */
export const unsatisfiableContentRange = (size: number) => `bytes */${size}`;
