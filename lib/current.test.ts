import { describe, expect, it } from "vitest";
import { compareByRecency, pickCurrent } from "./current";

const mod = (id: string, weekNumber: number, iso: string) => ({
  id,
  weekNumber,
  releaseDate: new Date(iso),
});

describe("current-module selection", () => {
  it("picks the most recently released module", () => {
    const w5 = mod("a", 5, "2026-08-10T09:00Z");
    const w6 = mod("b", 6, "2026-08-17T09:00Z");
    expect(pickCurrent([w5, w6])?.id).toBe("b");
  });

  it("early-released higher week does NOT displace the true current week", () => {
    // Week 7 released early as a preview; week 6 released later (this Monday).
    const w6 = mod("w6", 6, "2026-08-17T09:00Z");
    const w7preview = mod("w7", 7, "2026-08-14T09:00Z");
    expect(pickCurrent([w6, w7preview])?.id).toBe("w6");
  });

  it("release-date ties break by higher week number, deterministically", () => {
    const a = mod("a", 6, "2026-08-17T09:00Z");
    const b = mod("b", 7, "2026-08-17T09:00Z");
    expect(pickCurrent([a, b])?.id).toBe("b");
    expect(pickCurrent([b, a])?.id).toBe("b");
  });

  it("full ties break by id — exactly one module is ever current", () => {
    const a = mod("a", 6, "2026-08-17T09:00Z");
    const b = mod("b", 6, "2026-08-17T09:00Z");
    expect(pickCurrent([a, b])?.id).toBe("a");
    expect([a, b].sort(compareByRecency)).toEqual([b, a].sort(compareByRecency));
  });

  it("returns null when nothing is released", () => {
    expect(pickCurrent([])).toBeNull();
  });
});
