import { describe, expect, it } from "vitest";
import { buildCalendarMonth, type CalendarRelease } from "./calendar";

// September 2026 in Athens: Sep 1 is a Tuesday, so the Monday-first grid
// runs Mon 31 Aug through Sun 4 Oct (5 rows). Thursdays: 3, 10, 17, 24.
const NOW = new Date("2026-09-10T10:00:00Z");

const release = (over: Partial<CalendarRelease> = {}): CalendarRelease => ({
  moduleId: "m1",
  weekNumber: 6,
  title: "Buffers",
  courseName: "Chemistry HL 2027",
  releaseDate: new Date("2026-08-31T21:30:00Z"),
  ...over,
});

const noClinic = { day: "", time: "", note: "" };

const build = (over: Partial<Parameters<typeof buildCalendarMonth>[0]> = {}) =>
  buildCalendarMonth({ month: "2026-09", now: NOW, releases: [], clinic: noClinic, ...over });

describe("buildCalendarMonth (SPEC §15.7 #18)", () => {
  it("frames the month: title, prev/next, Monday-first grid, today", () => {
    const cal = build();
    expect(cal.title).toBe("September 2026");
    expect(cal.monthParam).toBe("2026-09");
    expect(cal.prev).toBe("2026-08");
    expect(cal.next).toBe("2026-10");
    expect(cal.weeks).toHaveLength(5);
    expect(cal.weeks[0][0]).toMatchObject({ iso: "2026-08-31", day: 31, inMonth: false });
    expect(cal.weeks[4][6]).toMatchObject({ iso: "2026-10-04", day: 4, inMonth: false });
    const todays = cal.weeks.flat().filter((d) => d.today);
    expect(todays.map((d) => d.iso)).toEqual(["2026-09-10"]);
  });

  it("rolls prev/next over year boundaries", () => {
    expect(build({ month: "2026-01" }).prev).toBe("2025-12");
    expect(build({ month: "2026-12" }).next).toBe("2027-01");
  });

  it("places releases on their Athens calendar day with wall-clock time", () => {
    // 21:30Z on 31 Aug is 00:30 on 1 Sep in Athens (UTC+3).
    const cal = build({
      releases: [
        release(),
        release({ moduleId: "m2", weekNumber: 9, title: "Redox", releaseDate: new Date("2026-09-28T06:00:00Z") }),
        release({ moduleId: "off", releaseDate: new Date("2026-10-05T06:00:00Z") }),
      ],
    });
    const sep1 = cal.weeks.flat().find((d) => d.iso === "2026-09-01")!;
    expect(sep1.entries).toEqual([
      {
        kind: "release",
        time: "00:30",
        moduleId: "m1",
        weekNumber: 6,
        title: "Buffers",
        courseName: "Chemistry HL 2027",
        released: true,
      },
    ]);
    const sep28 = cal.weeks.flat().find((d) => d.iso === "2026-09-28")!;
    expect(sep28.entries[0]).toMatchObject({ moduleId: "m2", time: "09:00", released: false });
    // The October release is outside this month everywhere.
    expect(cal.weeks.flat().some((d) => d.entries.some((e) => e.kind === "release" && e.moduleId === "off"))).toBe(false);
  });

  it("marks the weekly clinic on every matching in-month day", () => {
    const cal = build({ clinic: { day: "thursday", time: "18:00", note: "Kinetics" } });
    const clinicDays = cal.weeks
      .flat()
      .filter((d) => d.entries.some((e) => e.kind === "clinic"))
      .map((d) => d.iso);
    expect(clinicDays).toEqual(["2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24"]);
    expect(cal.weeks.flat().find((d) => d.iso === "2026-09-03")!.entries[0]).toEqual({
      kind: "clinic",
      time: "18:00",
      note: "Kinetics",
    });
  });

  it("no clinic day means no clinic entries", () => {
    const cal = build({ clinic: { day: "", time: "18:00", note: "x" } });
    expect(cal.weeks.flat().every((d) => d.entries.every((e) => e.kind !== "clinic"))).toBe(true);
  });

  it("agenda lists only in-month days with entries, ascending", () => {
    const cal = build({
      releases: [release({ moduleId: "m2", releaseDate: new Date("2026-09-28T06:00:00Z") }), release()],
      clinic: { day: "thursday", time: "18:00", note: "" },
    });
    expect(cal.agenda.map((a) => a.iso)).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-10",
      "2026-09-17",
      "2026-09-24",
      "2026-09-28",
    ]);
    expect(cal.agenda[0].label).toMatch(/^Tue 1 Sept?$/);
  });

  it("falls back to the current month for junk month params", () => {
    for (const junk of [undefined, "junk", "2026-13", "1999-05"]) {
      const cal = build({ month: junk });
      expect(cal.monthParam).toBe("2026-09");
    }
  });
});
