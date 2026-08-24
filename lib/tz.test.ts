import { describe, expect, it } from "vitest";
import {
  mostRecentMondayAt,
  parseLocalInTz,
  toLocalInputValue,
} from "./tz";

describe("tutor-timezone datetime handling", () => {
  it("parses Athens winter wall time (UTC+2)", () => {
    expect(parseLocalInTz("2026-01-12T09:00", "Europe/Athens").toISOString()).toBe(
      "2026-01-12T07:00:00.000Z",
    );
  });

  it("parses Athens summer wall time (UTC+3, DST)", () => {
    expect(parseLocalInTz("2026-08-24T09:00", "Europe/Athens").toISOString()).toBe(
      "2026-08-24T06:00:00.000Z",
    );
  });

  it("round-trips instant → input value → instant", () => {
    const instant = new Date("2026-10-05T06:30:00.000Z");
    const input = toLocalInputValue(instant, "Europe/Athens");
    expect(input).toBe("2026-10-05T09:30");
    expect(parseLocalInTz(input, "Europe/Athens").getTime()).toBe(instant.getTime());
  });

  it("is server-timezone independent (UTC zone behaves as identity)", () => {
    expect(parseLocalInTz("2026-03-01T12:00", "UTC").toISOString()).toBe(
      "2026-03-01T12:00:00.000Z",
    );
  });
});

describe("mostRecentMondayAt", () => {
  it("mid-week anchors to this week's Monday", () => {
    // Thu 2026-08-20 → Mon 2026-08-17 09:00 EEST (UTC+3)
    expect(
      mostRecentMondayAt("09:00", new Date("2026-08-20T12:00:00Z"), "Europe/Athens").toISOString(),
    ).toBe("2026-08-17T06:00:00.000Z");
  });

  it("Sunday in UTC but already Monday 01:30 in Athens → previous Monday", () => {
    // The old system-TZ + UTC-date mix anchored this case to Sunday.
    expect(
      mostRecentMondayAt("09:00", new Date("2026-08-16T22:30:00Z"), "Europe/Athens").toISOString(),
    ).toBe("2026-08-10T06:00:00.000Z");
  });

  it("Monday 08:59 local → previous Monday; 09:00 exactly is inclusive", () => {
    expect(
      mostRecentMondayAt("09:00", new Date("2026-08-17T05:59:00Z"), "Europe/Athens").toISOString(),
    ).toBe("2026-08-10T06:00:00.000Z");
    expect(
      mostRecentMondayAt("09:00", new Date("2026-08-17T06:00:00Z"), "Europe/Athens").toISOString(),
    ).toBe("2026-08-17T06:00:00.000Z");
  });

  it("stays on Monday 09:00 wall time across the DST fall-back", () => {
    // DST ends 2026-10-25; Wed 2026-10-28 → Mon 2026-10-26 09:00 EET (UTC+2)
    expect(
      mostRecentMondayAt("09:00", new Date("2026-10-28T12:00:00Z"), "Europe/Athens").toISOString(),
    ).toBe("2026-10-26T07:00:00.000Z");
  });
});
