// The read-only calendar (SPEC §15.7 #18): module release dates plus the
// weekly clinic marker from settings, computed for one month in the tutor's
// timezone. Pure so both roles' pages and the tests share one definition.
// All grid math runs on UTC-pinned calendar dates (the lib/tz approach), so
// DST can never shift a day; only the release instants themselves are
// converted to Athens wall clock.

import { CLINIC_DAYS } from "./settings-rules";
import { APP_TIMEZONE, wallClock } from "./tz";

export type CalendarRelease = {
  moduleId: string;
  weekNumber: number;
  title: string;
  courseName: string;
  releaseDate: Date;
};

export type CalendarEntry =
  | {
      kind: "release";
      time: string;
      moduleId: string;
      weekNumber: number;
      title: string;
      courseName: string;
      released: boolean;
    }
  | { kind: "clinic"; time: string; note: string };

export type CalendarDay = {
  iso: string;
  day: number;
  inMonth: boolean;
  today: boolean;
  entries: CalendarEntry[];
};

export type CalendarMonth = {
  title: string;
  monthParam: string;
  prev: string;
  next: string;
  /** Monday-first rows covering the whole month. */
  weeks: CalendarDay[][];
  /** In-month days that have entries, ascending, for the 390px agenda. */
  agenda: { iso: string; label: string; entries: CalendarEntry[] }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const ym = (y: number, mo: number) => `${y}-${pad(mo)}`;

const agendaFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const titleFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

export function buildCalendarMonth(opts: {
  /** "yyyy-mm" searchParam; absent or invalid falls back to now's month. */
  month?: string;
  now: Date;
  releases: CalendarRelease[];
  clinic: { day: string; time: string; note: string };
  timeZone?: string;
}): CalendarMonth {
  const tz = opts.timeZone ?? APP_TIMEZONE;
  const nowWall = wallClock(opts.now, tz);

  let y = nowWall.y;
  let mo = nowWall.mo;
  const m = opts.month?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (m && Number(m[1]) >= 2020 && Number(m[1]) <= 2100) {
    y = Number(m[1]);
    mo = Number(m[2]);
  }

  const firstMs = Date.UTC(y, mo - 1, 1);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const mondayFirstIdx = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7;

  const entriesByDay = new Map<number, CalendarEntry[]>();
  const push = (day: number, entry: CalendarEntry) =>
    entriesByDay.set(day, [...(entriesByDay.get(day) ?? []), entry]);

  for (const r of opts.releases) {
    const w = wallClock(r.releaseDate, tz);
    if (w.y !== y || w.mo !== mo) continue;
    push(w.d, {
      kind: "release",
      time: `${pad(w.h)}:${pad(w.mi)}`,
      moduleId: r.moduleId,
      weekNumber: r.weekNumber,
      title: r.title,
      courseName: r.courseName,
      released: r.releaseDate.getTime() <= opts.now.getTime(),
    });
  }

  const clinicIdx = (CLINIC_DAYS as readonly string[]).indexOf(opts.clinic.day);
  if (clinicIdx >= 0) {
    for (let d = 1; d <= daysInMonth; d++) {
      if (mondayFirstIdx(Date.UTC(y, mo - 1, d)) === clinicIdx) {
        push(d, { kind: "clinic", time: opts.clinic.time, note: opts.clinic.note });
      }
    }
  }
  for (const list of entriesByDay.values()) {
    list.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  }

  const start = firstMs - mondayFirstIdx(firstMs) * DAY_MS;
  const totalCells = Math.ceil((mondayFirstIdx(firstMs) + daysInMonth) / 7) * 7;
  const cells: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(start + i * DAY_MS);
    const inMonth = date.getUTCMonth() === mo - 1 && date.getUTCFullYear() === y;
    const day = date.getUTCDate();
    cells.push({
      iso: date.toISOString().slice(0, 10),
      day,
      inMonth,
      today: inMonth && nowWall.y === y && nowWall.mo === mo && nowWall.d === day,
      entries: inMonth ? (entriesByDay.get(day) ?? []) : [],
    });
  }
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const agenda = [...entriesByDay.keys()]
    .sort((a, b) => a - b)
    .map((d) => ({
      iso: `${y}-${pad(mo)}-${pad(d)}`,
      label: agendaFmt.format(new Date(Date.UTC(y, mo - 1, d))),
      entries: entriesByDay.get(d)!,
    }));

  return {
    title: titleFmt.format(new Date(firstMs)),
    monthParam: ym(y, mo),
    prev: mo === 1 ? ym(y - 1, 12) : ym(y, mo - 1),
    next: mo === 12 ? ym(y + 1, 1) : ym(y, mo + 1),
    weeks,
    agenda,
  };
}
