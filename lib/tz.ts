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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Instant of the most recent Monday at wall-clock `time` ("HH:mm") in
 * `timeZone` that is at or before `now`. The weekday and calendar date are
 * derived in `timeZone` (never the server's), and the week step is
 * calendar-based, so DST transitions cannot shift the result off Monday or
 * off `time`.
 */
export function mostRecentMondayAt(
  time: string,
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): Date {
  const w = wallParts(now, timeZone);
  // The tz's calendar date pinned to UTC midnight: pure date arithmetic on it
  // is DST-free, and getUTCDay() gives that calendar date's weekday.
  const todayUtc = Date.UTC(w.y, w.mo - 1, w.d);
  const daysSinceMonday = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const at = (ms: number) => parseLocalInTz(`${isoDate(ms)}T${time}`, timeZone);
  const candidate = at(todayUtc - daysSinceMonday * DAY_MS);
  return candidate.getTime() > now.getTime()
    ? at(todayUtc - (daysSinceMonday + 7) * DAY_MS)
    : candidate;
}

/**
 * SPEC §15.3: the admin due-date default is "the Sunday 23:59 after release"
 * — the first Sunday 23:59 strictly after the release wall-clock time. Pure
 * string → string on datetime-local values, so the browser form can compute
 * it without knowing the timezone; `defaultDueDate` below converts instants.
 */
export function defaultDueLocal(releaseLocal: string): string {
  const m = releaseLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, mo, d] = m.map(Number);
  const dayUtc = Date.UTC(y, mo - 1, d);
  const daysToSunday = (7 - new Date(dayUtc).getUTCDay()) % 7; // Sunday = 0
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (ms: number) => {
    const t = new Date(ms);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T23:59`;
  };
  const candidate = stamp(dayUtc + daysToSunday * DAY_MS);
  return candidate > releaseLocal ? candidate : stamp(dayUtc + (daysToSunday + 7) * DAY_MS);
}

export function defaultDueDate(release: Date, timeZone: string = APP_TIMEZONE): Date {
  return parseLocalInTz(defaultDueLocal(toLocalInputValue(release, timeZone)), timeZone);
}
