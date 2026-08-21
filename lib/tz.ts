// One-tenant timezone handling (SPEC §3 allows hardcoded assumptions; the
// tutor teaches from Athens). Servers run UTC, so both sides of the admin's
// datetime-local round trip — and every displayed date — must speak the
// tutor's timezone explicitly, not the server's.

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/Athens";

const wallParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour") % 24,
    mi: get("minute"),
    s: get("second"),
  };
};

/** The tz's UTC offset (ms) at a given instant. */
const offsetAt = (instant: Date, timeZone: string) => {
  const w = wallParts(instant, timeZone);
  const asUtc = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);
  return asUtc - instant.getTime();
};

/**
 * Parses a datetime-local string ("YYYY-MM-DDTHH:mm") as wall-clock time in
 * `timeZone` and returns the actual instant. Two-pass to converge across
 * DST boundaries.
 */
export function parseLocalInTz(value: string, timeZone: string = APP_TIMEZONE): Date {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(NaN);
  const [, y, mo, d, h, mi] = m.map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  let offset = offsetAt(new Date(utcGuess), timeZone);
  offset = offsetAt(new Date(utcGuess - offset), timeZone);
  return new Date(utcGuess - offset);
}

/** Formats an instant as a datetime-local value in `timeZone`. */
export function toLocalInputValue(date: Date, timeZone: string = APP_TIMEZONE): string {
  const w = wallParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.y}-${pad(w.mo)}-${pad(w.d)}T${pad(w.h)}:${pad(w.mi)}`;
}
