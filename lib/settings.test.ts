import { beforeAll, describe, expect, it } from "vitest";
import { migrateTestDb } from "./testing/memory-db";

type Schema = typeof import("@/db/schema");
type User = Schema["users"]["$inferSelect"];
let s: typeof import("./settings");
let db: Awaited<ReturnType<typeof migrateTestDb>>;
let admin: User, student: User;

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeAll(async () => {
  db = await migrateTestDb();
  s = await import("./settings");
  const schema = await import("@/db/schema");
  [admin, student] = await db
    .insert(schema.users)
    .values([
      { role: "admin", name: "Dimitra", username: "dimitra", passwordHash: "locked", email: "d@x" },
      { role: "student", name: "Nikos", username: "nikos", passwordHash: "locked", email: "n@x" },
    ])
    .returning();
}, 30_000); // migrates a fresh in-memory PGlite — slow on a loaded machine

describe("settings (SPEC §15.3: booking_url, clinic_text, clinic_day, clinic_time)", () => {
  it("reads empty strings when nothing has been saved", async () => {
    expect(await s.getSettings()).toEqual({ bookingUrl: "", clinicText: "", clinicDay: "", clinicTime: "" });
  });

  it("admin saves all values (upsert) and reads them back", async () => {
    expect(
      await s.updateSettings(
        admin,
        form({
          bookingUrl: "https://calendar.app.google/abc",
          clinicText: " Thu 18:00 ",
          clinicDay: "thursday",
          clinicTime: "18:00",
        }),
      ),
    ).toEqual({ ok: true });
    expect(await s.getSettings()).toEqual({
      bookingUrl: "https://calendar.app.google/abc",
      clinicText: "Thu 18:00",
      clinicDay: "thursday",
      clinicTime: "18:00",
    });
    expect(
      await s.updateSettings(admin, form({ bookingUrl: "", clinicText: "Fri 17:00", clinicDay: "", clinicTime: "" })),
    ).toEqual({ ok: true });
    expect(await s.getSettings()).toEqual({ bookingUrl: "", clinicText: "Fri 17:00", clinicDay: "", clinicTime: "" });
  });

  it("rejects an invalid booking URL without touching stored values", async () => {
    expect(
      await s.updateSettings(admin, form({ bookingUrl: "javascript:alert(1)", clinicText: "x", clinicDay: "", clinicTime: "" })),
    ).toEqual({
      ok: false,
      reason: "invalid-url",
    });
    expect(await s.getSettings()).toEqual({ bookingUrl: "", clinicText: "Fri 17:00", clinicDay: "", clinicTime: "" });
  });

  it("rejects an invalid clinic day or time without touching stored values", async () => {
    expect(
      await s.updateSettings(admin, form({ bookingUrl: "", clinicText: "", clinicDay: "someday", clinicTime: "" })),
    ).toEqual({ ok: false, reason: "invalid-day" });
    expect(
      await s.updateSettings(admin, form({ bookingUrl: "", clinicText: "", clinicDay: "monday", clinicTime: "7pm" })),
    ).toEqual({ ok: false, reason: "invalid-time" });
    expect((await s.getSettings()).clinicText).toBe("Fri 17:00");
  });

  it("a student cannot write settings", async () => {
    await expect(
      s.updateSettings(student, form({ bookingUrl: "https://evil.example", clinicText: "", clinicDay: "", clinicTime: "" })),
    ).rejects.toThrow(/not-admin/);
    expect((await s.getSettings()).bookingUrl).toBe("");
  });
});
