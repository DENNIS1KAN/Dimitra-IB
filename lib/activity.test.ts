import { describe, expect, it } from "vitest";
import { lastActivityLine, type ActivityInput } from "./activity";

// SPEC §15.7 #27: the last-activity line on the admin progress tab.

const base: ActivityInput = {
  lastSeenAt: null,
  accountPaused: false,
  enrollmentPaused: false,
  pausedAt: null,
};

// 14:00 Athens on a Wednesday, so "today" and "yesterday" cannot straddle
// midnight UTC by accident.
const NOW = new Date("2026-08-26T11:00:00Z");
const DAY = 86_400_000;

describe("lastActivityLine", () => {
  it("says never signed in rather than guessing", () => {
    expect(lastActivityLine(base, NOW)).toBe("Never signed in");
  });

  it("names today and yesterday, then falls back to the day", () => {
    expect(lastActivityLine({ ...base, lastSeenAt: new Date(NOW.getTime() - 3600_000) }, NOW)).toBe(
      "Last active today",
    );
    expect(lastActivityLine({ ...base, lastSeenAt: new Date(NOW.getTime() - DAY) }, NOW)).toBe(
      "Last active yesterday",
    );
    expect(lastActivityLine({ ...base, lastSeenAt: new Date(NOW.getTime() - 5 * DAY) }, NOW)).toBe(
      "Last active Fri 21 Aug",
    );
  });

  it("counts the tutor's day, not the server's", () => {
    // 23:30 Athens on the 26th is 20:30 UTC — still today for her.
    const lateEvening = new Date("2026-08-25T20:30:00Z");
    const nextMorning = new Date("2026-08-25T21:30:00Z"); // 00:30 Athens on the 26th
    expect(lastActivityLine({ ...base, lastSeenAt: lateEvening }, nextMorning)).toBe(
      "Last active yesterday",
    );
  });

  it("puts a pause ahead of the activity line, with its date", () => {
    const pausedAt = new Date("2026-08-22T09:00:00Z");
    expect(
      lastActivityLine(
        { ...base, lastSeenAt: NOW, enrollmentPaused: true, pausedAt },
        NOW,
      ),
    ).toBe("Paused Sat 22 Aug");
    expect(
      lastActivityLine({ ...base, lastSeenAt: NOW, enrollmentPaused: true }, NOW),
    ).toBe("Paused in this course");
    expect(lastActivityLine({ ...base, lastSeenAt: NOW, accountPaused: true }, NOW)).toBe(
      "Access paused",
    );
  });
});
