import { APP_TIMEZONE } from "./tz";

// Date copy per DESIGN.md: "Mon 12 Oct", "Unlocks Mon 19 Oct 09:00".
// Always rendered in the tutor's timezone (lib/tz.ts) — servers run UTC.
const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatDay = (d: Date) => dayFmt.format(d);
export const formatUnlock = (d: Date) => `Unlocks ${dayFmt.format(d)} ${timeFmt.format(d)}`;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** Was this released within the last 7 days? (drives the "New" badge) */
export const isNewRelease = (releaseDate: Date, now = new Date()) => {
  const age = now.getTime() - releaseDate.getTime();
  return age >= 0 && age < 7 * 24 * 60 * 60 * 1000;
};

/** "Due Sun 30 Aug 23:59" — soft deadline copy (SPEC §15.1). */
export const formatDue = (d: Date) => `Due ${dayFmt.format(d)} ${timeFmt.format(d)}`;

/** "Mon 17 Aug · 14:05" — message timestamps, tutor timezone. */
export const formatDateTime = (d: Date) => `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
