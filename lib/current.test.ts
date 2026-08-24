import { describe, expect, it } from "vitest";
import { compareByRecency, pickCurrent } from "./current";

// SPEC §15.7 #16 (owner decision, M10): most recent release wins; ties →
// alphabetical course title; same course → higher week number. Never by id.
const mod = (
  id: string,
  weekNumber: number,
  release: string,
  course = "Chemistry HL 2027",
) => ({
  id,
  weekNumber,
  releaseDate: new Date(release),
  courseTitle: course,
});

describe("current-module selection", () => {
  it("picks the most recently released module", () => {
    const w5 = mod("a", 5, "2026-08-10T09:00Z");
    const w6 = mod("b", 6, "2026-08-17T09:00Z");
    expect(pickCurrent([w5, w6])?.id).toBe("b");
  });

  it("early-released higher week does NOT displace the true current week", () => {
    const w6 = mod("w6", 6, "2026-08-17T09:00Z");
    const w7preview = mod("w7", 7, "2026-08-14T09:00Z");
    expect(pickCurrent([w6, w7preview])?.id).toBe("w6");
  });

  it("two courses releasing the same day: alphabetical course title wins (ids disagree on purpose)", () => {
    const hl = mod("z", 6, "2026-08-17T09:00Z", "Chemistry HL 2027");
    const sl = mod("a", 6, "2026-08-17T09:00Z", "Chemistry SL 2027");
    expect(pickCurrent([hl, sl])?.id).toBe("z");
    expect(pickCurrent([sl, hl])?.id).toBe("z");
  });

  it("same course, same release: higher week number wins", () => {
    const w6 = mod("b", 6, "2026-08-17T09:00Z");
    const w7 = mod("a", 7, "2026-08-17T09:00Z");
    expect(pickCurrent([w6, w7])?.id).toBe("a");
    expect(pickCurrent([w7, w6])?.id).toBe("a");
  });

  it("orders deterministically regardless of input order", () => {
    const a = mod("a", 6, "2026-08-17T09:00Z", "B course");
    const b = mod("b", 6, "2026-08-17T09:00Z", "A course");
    const c = mod("c", 5, "2026-08-10T09:00Z", "A course");
    expect([a, b, c].sort(compareByRecency).map((m) => m.id)).toEqual(["b", "a", "c"]);
    expect([c, a, b].sort(compareByRecency).map((m) => m.id)).toEqual(["b", "a", "c"]);
  });

  it("returns null when nothing is released", () => {
    expect(pickCurrent([])).toBeNull();
  });
});
