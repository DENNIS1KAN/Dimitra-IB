import { describe, expect, it } from "vitest";
import { parseLocalInTz, toLocalInputValue } from "./tz";

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
