import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The Phase 2 migration moves cohort membership from users.cohort_id into the
// enrollments table. This applies 0000–0004, plants pre-migration rows, then
// runs 0005 and checks the backfill — the "carefully backfilled" requirement
// of SPEC §15.3, tested against real SQL rather than read by eye.

const dir = path.resolve(__dirname, "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const statements = (file: string) =>
  readFileSync(path.join(dir, file), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

const COHORT = "11111111-1111-4111-8111-111111111111";
const NIKOS = "22222222-2222-4222-8222-222222222222";
const ELENI = "33333333-3333-4333-8333-333333333333";
const ADMIN = "44444444-4444-4444-8444-444444444444";

describe("migration 0005 — enrollments backfill", () => {
  it("turns every users.cohort_id into an active enrollment, then drops the column", async () => {
    const pg = new PGlite();
    const before = files.filter((f) => !f.startsWith("0005"));
    const m0005 = files.find((f) => f.startsWith("0005"));
    expect(m0005).toBeDefined();
    for (const f of before) for (const s of statements(f)) await pg.exec(s);

    await pg.exec(
      `INSERT INTO cohorts (id, name, subject, level, exam_year) VALUES ('${COHORT}', 'Chem', 'Chemistry', 'HL', 2027)`,
    );
    await pg.exec(`INSERT INTO users (id, role, name, username, password_hash, email, cohort_id, active, created_at) VALUES
      ('${NIKOS}', 'student', 'Nikos', 'nikos', 'locked', 'n@x', '${COHORT}', true, '2026-01-05T10:00:00Z'),
      ('${ELENI}', 'student', 'Eleni', 'eleni', 'locked', 'e@x', '${COHORT}', false, '2026-01-06T10:00:00Z'),
      ('${ADMIN}', 'admin', 'Dimitra', 'dimitra', 'locked', 'd@x', NULL, true, '2026-01-01T10:00:00Z')`);

    for (const s of statements(m0005!)) await pg.exec(s);

    const { rows } = await pg.query<{
      student_id: string;
      cohort_id: string;
      status: string;
      requested_at: Date;
      decided_at: Date;
    }>(`SELECT student_id, cohort_id, status, requested_at, decided_at FROM enrollments ORDER BY student_id`);
    expect(rows.map((r) => [r.student_id, r.cohort_id, r.status])).toEqual([
      [NIKOS, COHORT, "active"],
      [ELENI, COHORT, "active"],
    ]);
    expect(rows[0].requested_at.toISOString()).toBe("2026-01-05T10:00:00.000Z");
    expect(rows[0].decided_at.toISOString()).toBe("2026-01-05T10:00:00.000Z");

    const cols = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
    );
    expect(cols.rows.map((c) => c.column_name)).not.toContain("cohort_id");

    // The global master switch survives untouched (Rule 3 screen unchanged).
    const active = await pg.query<{ active: boolean }>(`SELECT active FROM users WHERE id = '${ELENI}'`);
    expect(active.rows[0].active).toBe(false);

    // New Phase 2 columns/tables exist with their defaults.
    const cohort = await pg.query<{ is_listed: boolean; blurb: string | null }>(
      `SELECT is_listed, blurb FROM cohorts WHERE id = '${COHORT}'`,
    );
    expect(cohort.rows[0]).toEqual({ is_listed: false, blurb: null });
    await pg.exec(`INSERT INTO settings (key, value) VALUES ('booking_url', '')`);
    await pg.close();
  }, 30_000); // boots a fresh PGlite and replays every migration — ~5s on slow machines
});
