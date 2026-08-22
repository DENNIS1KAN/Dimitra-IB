import { describe, expect, it } from "vitest";
import { isUuid } from "./validate";

// Every API route (/api/materials/[id], /api/events, /api/submissions,
// /api/admin/materials) and studentModuleDetail gate ids through isUuid so
// malformed ids answer 404/400 instead of Postgres 22P02 500s.
describe("id shape validation", () => {
  it("accepts real uuids", () => {
    expect(isUuid("394dd303-d47b-4886-a7e5-3fe11f764c84")).toBe(true);
    expect(isUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
  });

  it("rejects everything Postgres would 22P02 on", () => {
    for (const bad of [
      "",
      "abc",
      "week-3",
      "not-a-uuid",
      "394dd303-d47b-4886-a7e5",                     // truncated
      "394dd303-d47b-4886-a7e5-3fe11f764c84ff",      // too long
      "394dd303d47b4886a7e53fe11f764c84",            // no dashes
      "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",        // non-hex
      "394dd303-d47b-4886-a7e5-3fe11f764c84\n",      // trailing junk
      "'; DROP TABLE users; --",
    ]) {
      expect(isUuid(bad), bad).toBe(false);
    }
  });
});
