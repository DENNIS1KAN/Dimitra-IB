# M6 — Enrollments + Catalog + Deadlines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-cohort-per-student model with enrollments (requested → active / paused / ended), add a course catalog with "Ask to join" + admin approval, add soft due dates with overdue badges, and ship `/app/courses` + `/app/assignments` — without changing what any existing student sees.

**Architecture:** One Drizzle migration adds `enrollments`, `messages`, `settings`, the cohort catalog fields and `modules.due_date`, backfills an active enrollment from every `users.cohort_id`, then drops that column. `lib/gating.ts` stays the single tested decision point — Rule 1 now takes the student's enrollment list; a new server-only `lib/access.ts` loads it per request and every consumer (pages, queries, the three API routes) passes that instead of the raw user row. New student pages are server components + server actions (progressive enhancement, no client state), built from DESIGN.md recipes and mounted under one `/app` layout that carries the single student nav.

**Tech Stack:** Next.js 16 App Router (async `params`/`searchParams`, server actions), TypeScript strict, Drizzle ORM 0.45 + drizzle-kit 0.31 (PGlite in dev, Postgres in prod), Vitest 4, Tailwind 4 + in-repo `components/lumen/*`.

**Spec:** `SPEC.md` §15 (Phase 2 amendments; M6 checklist in §15.6) — read it first. `DESIGN.md` for every visual value.

## Global Constraints

- SPEC.md is authoritative for scope/behavior, DESIGN.md for visuals; conflicts get flagged in SPEC §15.7, never silently resolved.
- The gating rules live in `lib/gating.ts` only; every access decision (pages *and* `/api/*`) goes through them.
- Mobile-first: every student screen is built and checked at **390px** before desktop; desktop is a responsive layout of the same route.
- Screens are the real app wired to the database — no placeholder JSON.
- All ids from params/forms are shape-checked with `isUuid` (`lib/validate.ts`) before touching uuid columns.
- All displayed dates use the tutor's timezone via `lib/tz.ts` / `lib/format.ts` (`APP_TIMEZONE`, default `Europe/Athens`).
- Every commit: `npm test`, `npm run typecheck`, `npm run lint` green. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The embedded dev DB is single-process: stop `npm run dev` before `db:migrate` / `db:seed`.
- Tests never touch `./pgdata-lite`: DB-backed tests use an in-memory PGlite injected through the `globalThis.__lumenPglite` seam in `db/index.ts`.
- Username + password auth is untouched.

---

### Task 1: Due-date helpers (pure, tutor-timezone)

**Files:**
- Modify: `lib/tz.ts` (append)
- Test: `lib/tz.test.ts` (append)

**Interfaces:**
- Produces: `defaultDueLocal(releaseLocal: string): string` — datetime-local string → datetime-local string of the first Sunday 23:59 strictly after it. `defaultDueDate(release: Date, timeZone?: string): Date` — instant → instant, via the tutor timezone.

- [ ] **Step 1: Write the failing tests**

Append to `lib/tz.test.ts`:

```ts
import { defaultDueDate, defaultDueLocal } from "./tz";

describe("default due date — first Sunday 23:59 strictly after release", () => {
  it("Monday release → the coming Sunday", () => {
    expect(defaultDueLocal("2026-08-24T09:00")).toBe("2026-08-30T23:59");
  });
  it("Sunday morning release → that same Sunday evening", () => {
    expect(defaultDueLocal("2026-08-30T10:00")).toBe("2026-08-30T23:59");
  });
  it("Sunday 23:59 release → the following Sunday (strictly after)", () => {
    expect(defaultDueLocal("2026-08-30T23:59")).toBe("2026-09-06T23:59");
  });
  it("rolls over month and year boundaries", () => {
    expect(defaultDueLocal("2026-12-29T09:00")).toBe("2027-01-03T23:59");
  });
  it("returns '' for unparseable input", () => {
    expect(defaultDueLocal("")).toBe("");
    expect(defaultDueLocal("nonsense")).toBe("");
  });
  it("instant variant speaks the tutor's timezone (Athens, DST)", () => {
    // Mon 2026-08-24 09:00 EEST = 06:00Z → Sun 2026-08-30 23:59 EEST = 20:59Z
    expect(defaultDueDate(new Date("2026-08-24T06:00:00Z"), "Europe/Athens").toISOString()).toBe(
      "2026-08-30T20:59:00.000Z",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/tz.test.ts`
Expected: FAIL — `defaultDueLocal` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/tz.ts`:

```ts
/**
 * SPEC §15.3: the admin due-date default is "the Sunday 23:59 after release"
 * — the first Sunday 23:59 strictly after the release wall-clock time. Pure
 * string → string on datetime-local values, so the browser form can compute
 * it without knowing the timezone; the instant variant below converts.
 */
export function defaultDueLocal(releaseLocal: string): string {
  const m = releaseLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, mo, d] = m.map(Number);
  const dayUtc = Date.UTC(y, mo - 1, d);
  const daysToSunday = (7 - new Date(dayUtc).getUTCDay()) % 7; // Sunday = 0
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (ms: number) => {
    const t = new Date(ms);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T23:59`;
  };
  const candidate = stamp(dayUtc + daysToSunday * DAY_MS);
  return candidate > releaseLocal ? candidate : stamp(dayUtc + (daysToSunday + 7) * DAY_MS);
}

export function defaultDueDate(release: Date, timeZone: string = APP_TIMEZONE): Date {
  return parseLocalInTz(defaultDueLocal(toLocalInputValue(release, timeZone)), timeZone);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/tz.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/tz.ts lib/tz.test.ts
git commit -m "tz: default due date = first Sunday 23:59 after release"
```

---

### Task 2: Schema, migration with backfill, and the gating rewrite (one coherent data-model change)

This task is larger than the others because dropping `users.cohort_id` breaks every consumer at once; it ends green.

**Files:**
- Modify: `db/schema.ts`
- Create: `db/migrations/0005_*.sql` (generated, then hand-edited for the backfill) + `db/migrations/meta/*` (generated)
- Create: `lib/testing/memory-db.ts`, `db/migrate.test.ts`
- Rewrite: `lib/gating.ts`, `lib/gating.test.ts`
- Create: `lib/access.ts`, `lib/student.ts`
- Modify: `lib/queries.ts`, `lib/format.ts`, `app/api/materials/[id]/route.ts`, `app/api/events/route.ts`, `app/api/submissions/route.ts`, `app/admin/page.tsx`, `app/admin/actions.ts`, `app/admin/progress/page.tsx`, `db/seed-data.ts`
- Test: `lib/queries.test.ts`

**Interfaces:**
- Produces (schema): `enrollments`, `messages`, `settings` tables; `cohorts.blurb`, `cohorts.isListed`; `modules.dueDate`; types `Enrollment`, `EnrollmentStatus`.
- Produces (gating): `GatingStudent = { active: boolean; enrollments: readonly { cohortId: string; status: EnrollmentStatus }[] }`, `moduleState(module, student, now)`, `courseAccess(student, cohortId): EnrollmentStatus | "none"`, `isOverdue(dueDate, hasSubmission, now)`.
- Produces (access): `loadStudentAccess(user: User): Promise<StudentAccess>` where `StudentAccess = { active: boolean; enrollments: Enrollment[] }`.
- Produces (queries): `studentModuleList`, `studentModuleDetail` (now enrollment-aware, entries carry `cohort`, `overdue`), `studentCourses(user)`, `studentAssignments(user)`.

- [ ] **Step 1: Schema**

In `db/schema.ts`: add enums and tables; remove `cohortId` from `users`; add fields.

```ts
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["requested", "active", "paused", "ended"]);
export const messageSenderEnum = pgEnum("message_sender", ["student", "tutor"]);

// cohorts: add
  blurb: text("blurb"),
  isListed: boolean("is_listed").notNull().default(false),

// users: DELETE the cohortId line (enrollments replace it — SPEC §15.3)

// modules: add
  dueDate: timestamp("due_date", { withTimezone: true }),

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    cohortId: uuid("cohort_id").notNull().references(() => cohorts.id),
    status: enrollmentStatusEnum("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("enrollments_student_cohort_unique").on(t.studentId, t.cohortId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sender: messageSenderEnum("sender").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("messages_student_created_idx").on(t.studentId, t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Enrollment = typeof enrollments.$inferSelect;
export type EnrollmentStatus = Enrollment["status"];
export type Message = typeof messages.$inferSelect;
```

- [ ] **Step 2: Generate the migration, then add the backfill by hand**

Run: `npm run db:generate` → `db/migrations/0005_<name>.sql`. Open it. Move the `ALTER TABLE "users" DROP COLUMN "cohort_id"` (and its FK drop) so they come **after** the `enrollments` table + FK creation, and insert between them:

```sql
INSERT INTO "enrollments" ("student_id", "cohort_id", "status", "requested_at", "decided_at")
SELECT "id", "cohort_id", 'active', "created_at", "created_at" FROM "users" WHERE "cohort_id" IS NOT NULL;--> statement-breakpoint
```

- [ ] **Step 3: Write the migration test (in-memory PGlite)**

Create `lib/testing/memory-db.ts`:

```ts
// Test seam: db/index.ts reuses globalThis.__lumenPglite when present, so an
// in-memory PGlite set here (BEFORE "@/db" is imported) keeps tests away from
// ./pgdata-lite and its single-process lock.
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import path from "node:path";

const g = globalThis as unknown as { __lumenPglite?: PGlite };
g.__lumenPglite = new PGlite();

export const MIGRATIONS = { migrationsFolder: path.resolve(__dirname, "../../db/migrations") };

export async function migrateTestDb() {
  const { getDbDriver } = await import("@/db");
  const driver = getDbDriver();
  if (driver.kind !== "pglite") throw new Error("test db must be pglite");
  await migrate(driver.db as PgliteDatabase, MIGRATIONS);
  return driver.db;
}
```

Create `db/migrate.test.ts` — applies 0000–0004 by hand, inserts a pre-migration student, applies 0005, asserts the backfill:

```ts
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.resolve(__dirname, "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const statements = (file: string) =>
  readFileSync(path.join(dir, file), "utf8").split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);

describe("migration 0005 — enrollments backfill", () => {
  it("turns every users.cohort_id into an active enrollment, then drops the column", async () => {
    const pg = new PGlite();
    const before = files.filter((f) => !f.startsWith("0005"));
    const m0005 = files.find((f) => f.startsWith("0005"));
    expect(m0005).toBeDefined();
    for (const f of before) for (const s of statements(f)) await pg.exec(s);

    await pg.exec(`INSERT INTO cohorts (id, name, subject, level, exam_year) VALUES ('11111111-1111-4111-8111-111111111111', 'Chem', 'Chemistry', 'HL', 2027)`);
    await pg.exec(`INSERT INTO users (id, role, name, username, password_hash, email, cohort_id, active, created_at) VALUES
      ('22222222-2222-4222-8222-222222222222', 'student', 'Nikos', 'nikos', 'locked', 'n@x', '11111111-1111-4111-8111-111111111111', true, '2026-01-05T10:00:00Z'),
      ('33333333-3333-4333-8333-333333333333', 'student', 'Eleni', 'eleni', 'locked', 'e@x', '11111111-1111-4111-8111-111111111111', false, '2026-01-06T10:00:00Z'),
      ('44444444-4444-4444-8444-444444444444', 'admin', 'Dimitra', 'dimitra', 'locked', 'd@x', NULL, true, '2026-01-01T10:00:00Z')`);

    for (const s of statements(m0005!)) await pg.exec(s);

    const { rows } = await pg.query<{ student_id: string; status: string; requested_at: Date; decided_at: Date }>(
      `SELECT student_id, status, requested_at, decided_at FROM enrollments ORDER BY student_id`,
    );
    expect(rows.map((r) => [r.student_id, r.status])).toEqual([
      ["22222222-2222-4222-8222-222222222222", "active"],
      ["33333333-3333-4333-8333-333333333333", "active"],
    ]);
    expect(rows[0].requested_at.toISOString()).toBe("2026-01-05T10:00:00.000Z");
    expect(rows[0].decided_at.toISOString()).toBe("2026-01-05T10:00:00.000Z");

    const cols = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
    );
    expect(cols.rows.map((c) => c.column_name)).not.toContain("cohort_id");
    // the global switch survives untouched
    const active = await pg.query<{ active: boolean }>(`SELECT active FROM users WHERE username = 'eleni'`);
    expect(active.rows[0].active).toBe(false);
    await pg.close();
  });
});
```

Run: `npx vitest run db/migrate.test.ts` — Expected: PASS once Step 2 is right (it is the check on the hand edit).

- [ ] **Step 4: Rewrite the gating tests**

Replace `lib/gating.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { courseAccess, isModuleComplete, isOverdue, isPaused, moduleState, solutionsVisible } from "./gating";

const NOW = new Date("2026-08-21T12:00:00Z");
const past = new Date("2026-08-17T09:00:00Z");
const future = new Date("2026-08-24T09:00:00Z");
const modA = (releaseDate: Date) => ({ cohortId: "cohort-a", releaseDate });
const modB = (releaseDate: Date) => ({ cohortId: "cohort-b", releaseDate });
const student = (status: "requested" | "active" | "paused" | "ended" | null, active = true) => ({
  active,
  enrollments: status ? [{ cohortId: "cohort-a", status }] : [],
});

describe("Rule 1 — module visibility (enrollment-based, SPEC §15.2)", () => {
  it("opens a released module in an actively enrolled cohort", () => {
    expect(moduleState(modA(past), student("active"), NOW)).toBe("open");
  });
  it("opens a module released exactly now (release_date <= now)", () => {
    expect(moduleState(modA(NOW), student("active"), NOW)).toBe("open");
  });
  it("shows a future module in an active cohort as a locked teaser", () => {
    expect(moduleState(modA(future), student("active"), NOW)).toBe("locked-teaser");
  });
  it("hides everything in a cohort the student only REQUESTED", () => {
    expect(moduleState(modA(past), student("requested"), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("requested"), NOW)).toBe("invisible");
  });
  it("hides everything in a PAUSED enrollment — released or not", () => {
    expect(moduleState(modA(past), student("paused"), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("paused"), NOW)).toBe("invisible");
  });
  it("hides everything in an ENDED enrollment", () => {
    expect(moduleState(modA(past), student("ended"), NOW)).toBe("invisible");
  });
  it("never renders a cohort the student has no enrollment in", () => {
    expect(moduleState(modB(past), student("active"), NOW)).toBe("invisible");
    expect(moduleState(modB(future), student("active"), NOW)).toBe("invisible");
    expect(moduleState(modA(past), student(null), NOW)).toBe("invisible");
  });
  it("a paused enrollment hides only that course — the other keeps working", () => {
    const two = { active: true, enrollments: [
      { cohortId: "cohort-a", status: "paused" as const },
      { cohortId: "cohort-b", status: "active" as const },
    ] };
    expect(moduleState(modA(past), two, NOW)).toBe("invisible");
    expect(moduleState(modB(past), two, NOW)).toBe("open");
  });
  it("opens nothing for a globally paused student (Rule 3 wins)", () => {
    expect(moduleState(modA(past), student("active", false), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("active", false), NOW)).toBe("invisible");
  });
});

describe("course access (drives the course cards)", () => {
  it("reports the enrollment status for the cohort, or none", () => {
    expect(courseAccess(student("active"), "cohort-a")).toBe("active");
    expect(courseAccess(student("paused"), "cohort-a")).toBe("paused");
    expect(courseAccess(student("requested"), "cohort-a")).toBe("requested");
    expect(courseAccess(student("ended"), "cohort-a")).toBe("ended");
    expect(courseAccess(student("active"), "cohort-b")).toBe("none");
  });
});

describe("Rule 2 — solutions gating", () => {
  it("hides solutions before any submission", () => expect(solutionsVisible(false)).toBe(false));
  it("reveals solutions once a submission exists", () => expect(solutionsVisible(true)).toBe(true));
  it("marks the module complete iff a submission exists", () => {
    expect(isModuleComplete(false)).toBe(false);
    expect(isModuleComplete(true)).toBe(true);
  });
});

describe("Rule 3 — paused behavior", () => {
  it("flags an inactive student as paused", () => expect(isPaused({ active: false })).toBe(true));
  it("does not flag an active student", () => expect(isPaused({ active: true })).toBe(false));
});

describe("soft deadline — overdue is a badge, never a gate (SPEC §15.1)", () => {
  const due = new Date("2026-08-20T20:59:00Z");
  it("is overdue after the due date with no submission", () => expect(isOverdue(due, false, NOW)).toBe(true));
  it("clears on submit", () => expect(isOverdue(due, true, NOW)).toBe(false));
  it("is not overdue before the due date", () => expect(isOverdue(due, false, new Date("2026-08-19T00:00:00Z"))).toBe(false));
  it("is not overdue exactly at the due instant", () => expect(isOverdue(due, false, due)).toBe(false));
  it("never overdue without a due date", () => expect(isOverdue(null, false, NOW)).toBe(false));
});
```

Run: `npx vitest run lib/gating.test.ts` — Expected: FAIL (new exports missing, old signature).

- [ ] **Step 5: Rewrite `lib/gating.ts`**

```ts
// The access rules from SPEC §5 as amended by §15.2 — the entire business
// logic. Pure functions so they are trivially unit-testable; queries call
// these (and additionally filter by the student's active cohorts in SQL so
// other cohorts' modules never even leave the database layer).

export type EnrollmentStatus = "requested" | "active" | "paused" | "ended";

export type GatingEnrollment = { cohortId: string; status: EnrollmentStatus };

export type GatingStudent = {
  active: boolean; // users.active — the global master switch (Rule 3)
  enrollments: readonly GatingEnrollment[];
};

export type GatingModule = { cohortId: string; releaseDate: Date };

export type ModuleState = "open" | "locked-teaser" | "invisible";

/** Rule 3 — Paused behavior (deliberately blunt): an inactive student sees only the full-screen paused state. */
export function isPaused(student: { active: boolean }): boolean {
  return !student.active;
}

/** The student's standing in a cohort — "none" when they have no enrollment row. */
export function courseAccess(student: GatingStudent, cohortId: string): EnrollmentStatus | "none" {
  return student.enrollments.find((e) => e.cohortId === cohortId)?.status ?? "none";
}

/**
 * Rule 1 — Module visibility (enrollment-based).
 * open           iff ACTIVE enrollment in the module's cohort AND released AND users.active
 * locked-teaser  for future modules in actively enrolled cohorts
 * invisible      for everything else: no / requested / paused / ended enrollment,
 *                or a globally paused student (never rendered, 404 by direct URL)
 */
export function moduleState(module: GatingModule, student: GatingStudent, now: Date): ModuleState {
  if (isPaused(student)) return "invisible";
  if (courseAccess(student, module.cohortId) !== "active") return "invisible";
  if (module.releaseDate.getTime() <= now.getTime()) return "open";
  return "locked-teaser";
}

/** Rule 2 — Solutions gating: visible iff the student has a submission; the same fact marks the module complete. */
export function solutionsVisible(hasSubmission: boolean): boolean {
  return hasSubmission;
}

export function isModuleComplete(hasSubmission: boolean): boolean {
  return hasSubmission;
}

/**
 * Soft deadline (SPEC §15.1): overdue iff a due date exists, has passed, and
 * nothing was submitted. A badge only — submission is never blocked.
 */
export function isOverdue(dueDate: Date | null, hasSubmission: boolean, now: Date): boolean {
  return dueDate !== null && now.getTime() > dueDate.getTime() && !hasSubmission;
}
```

Run: `npx vitest run lib/gating.test.ts` — Expected: PASS.

- [ ] **Step 6: Access loader + requireStudent**

Create `lib/access.ts`:

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, type Enrollment, type User } from "@/db/schema";
import type { GatingStudent } from "./gating";

/** Everything Rule 1 needs about a student, loaded once per request. */
export type StudentAccess = GatingStudent & { enrollments: Enrollment[] };

export async function loadStudentAccess(user: User): Promise<StudentAccess> {
  const rows =
    user.role === "student"
      ? await db.select().from(enrollments).where(eq(enrollments.studentId, user.id))
      : [];
  return { active: user.active, enrollments: rows };
}

export const activeCohortIds = (access: StudentAccess) =>
  access.enrollments.filter((e) => e.status === "active").map((e) => e.cohortId);
```

Create `lib/student.ts`:

```ts
import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/** Every student page and student server action goes through this. */
export async function requireStudent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/admin");
  return user;
}
```

- [ ] **Step 7: API routes**

In `app/api/materials/[id]/route.ts`, `app/api/events/route.ts`, `app/api/submissions/route.ts`: import `loadStudentAccess` from `@/lib/access` and replace each `moduleState(module, user, new Date())` with `moduleState(module, await loadStudentAccess(user), new Date())`. (materials: only inside the `user.role !== "admin"` branch.)

- [ ] **Step 8: Queries**

Rewrite `lib/queries.ts` (full file — the list/detail shapes change and two queries are new):

```ts
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts, materials, modules, submissions,
  type Cohort, type Enrollment, type Material, type Module, type User,
} from "@/db/schema";
import { loadStudentAccess, type StudentAccess } from "./access";
import { compareByRecency, pickCurrent } from "./current";
import { isModuleComplete, isOverdue, moduleState, type ModuleState } from "./gating";
import { isUuid } from "./validate";

export type ModuleListEntry = {
  module: Module;
  cohort: Cohort;
  state: ModuleState;
  complete: boolean;
  overdue: boolean;
  materialCounts: Record<string, number>;
};

export type StudentModuleList = {
  access: StudentAccess;
  /** Cohorts with an ACTIVE enrollment — the only ones Rule 1 can open. */
  activeCohorts: Cohort[];
  pausedCohorts: Cohort[];
  current: ModuleListEntry | null;
  olderReleased: ModuleListEntry[];
  future: ModuleListEntry[];
  completedCount: number;
  releasedCount: number;
};

async function cohortsById(ids: string[]) {
  const rows = ids.length ? await db.select().from(cohorts).where(inArray(cohorts.id, ids)) : [];
  return new Map(rows.map((c) => [c.id, c]));
}

async function submissionMap(studentId: string, moduleIds: string[]) {
  const subs = moduleIds.length
    ? await db.select().from(submissions)
        .where(and(eq(submissions.studentId, studentId), inArray(submissions.moduleId, moduleIds)))
    : [];
  return new Map(subs.map((s) => [s.moduleId, s]));
}

/**
 * Everything /app needs. Cohort filtering happens in SQL on the student's
 * ACTIVE enrollments (other cohorts' modules never leave the DB layer —
 * Rule 1's "invisible"); open/teaser classification still goes through
 * lib/gating so the tested rules are the only decision point.
 */
export async function studentModuleList(student: User): Promise<StudentModuleList> {
  const now = new Date();
  const access = await loadStudentAccess(student);
  const byId = await cohortsById(access.enrollments.map((e) => e.cohortId));
  const pick = (status: Enrollment["status"]) =>
    access.enrollments.filter((e) => e.status === status).map((e) => byId.get(e.cohortId)).filter((c): c is Cohort => !!c);
  const activeCohorts = pick("active");
  const pausedCohorts = pick("paused");
  const empty: StudentModuleList = {
    access, activeCohorts, pausedCohorts, current: null, olderReleased: [], future: [], completedCount: 0, releasedCount: 0,
  };
  if (activeCohorts.length === 0 || !student.active) return empty;

  const rows = await db.select().from(modules)
    .where(inArray(modules.cohortId, activeCohorts.map((c) => c.id)))
    .orderBy(asc(modules.weekNumber));
  const subs = await submissionMap(student.id, rows.map((m) => m.id));
  const mats = rows.length
    ? await db.select({ moduleId: materials.moduleId, type: materials.type }).from(materials)
        .where(inArray(materials.moduleId, rows.map((m) => m.id)))
    : [];
  const countsByModule = new Map<string, Record<string, number>>();
  for (const m of mats) {
    const c = countsByModule.get(m.moduleId) ?? {};
    c[m.type] = (c[m.type] ?? 0) + 1;
    countsByModule.set(m.moduleId, c);
  }

  const entries: ModuleListEntry[] = rows.map((module) => {
    const has = subs.has(module.id);
    return {
      module,
      cohort: byId.get(module.cohortId)!,
      state: moduleState(module, access, now),
      complete: isModuleComplete(has),
      overdue: isOverdue(module.dueDate, has, now),
      materialCounts: countsByModule.get(module.id) ?? {},
    };
  });

  const released = entries.filter((e) => e.state === "open");
  const future = entries.filter((e) => e.state === "locked-teaser")
    .sort((a, b) => a.module.releaseDate.getTime() - b.module.releaseDate.getTime());
  const currentModule = pickCurrent(released.map((e) => e.module));
  const current = released.find((e) => e.module.id === currentModule?.id) ?? null;
  const olderReleased = released.filter((e) => e.module.id !== currentModule?.id)
    .sort((a, b) => compareByRecency(a.module, b.module));

  return {
    ...empty, current, olderReleased, future,
    completedCount: released.filter((e) => e.complete).length,
    releasedCount: released.length,
  };
}

export type StudentModuleDetail = {
  module: Module;
  cohort: Cohort;
  materials: Material[];
  hasSubmission: boolean;
  overdue: boolean;
  isCurrent: boolean;
};

/** Module page data; null when the module must not exist for this student (Rule 1 → 404). */
export async function studentModuleDetail(moduleId: string, student: User): Promise<StudentModuleDetail | null> {
  if (!isUuid(moduleId)) return null;
  const now = new Date();
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return null;
  const access = await loadStudentAccess(student);
  if (moduleState(module, access, now) !== "open") return null;

  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, module.cohortId));
  const mats = await db.select().from(materials).where(eq(materials.moduleId, module.id))
    .orderBy(asc(materials.sortOrder), asc(materials.id));
  const [sub] = await db.select().from(submissions)
    .where(and(eq(submissions.studentId, student.id), eq(submissions.moduleId, module.id)));
  const siblings = await db.select().from(modules).where(eq(modules.cohortId, module.cohortId));
  const releasedSiblings = siblings.filter((m) => m.releaseDate.getTime() <= now.getTime());
  const isCurrent = pickCurrent(releasedSiblings)?.id === module.id;

  return { module, cohort, materials: mats, hasSubmission: !!sub, overdue: isOverdue(module.dueDate, !!sub, now), isCurrent };
}

// --- /app/courses -----------------------------------------------------------

export type MyCourse = {
  cohort: Cohort;
  enrollment: Enrollment;
  releasedCount: number;
  completedCount: number;
};
export type CatalogCourse = { cohort: Cohort; requested: boolean };
export type StudentCourses = { mine: MyCourse[]; catalog: CatalogCourse[] };

/** My courses (active / paused) + the catalog of listed cohorts I'm not in. */
export async function studentCourses(student: User): Promise<StudentCourses> {
  const now = new Date();
  const access = await loadStudentAccess(student);
  const byCohort = new Map(access.enrollments.map((e) => [e.cohortId, e]));
  const listed = await db.select().from(cohorts).where(eq(cohorts.isListed, true)).orderBy(asc(cohorts.name));
  const mineIds = access.enrollments.filter((e) => e.status === "active" || e.status === "paused").map((e) => e.cohortId);
  const byId = await cohortsById(mineIds);

  const mods = mineIds.length
    ? await db.select().from(modules).where(inArray(modules.cohortId, mineIds))
    : [];
  const subs = await submissionMap(student.id, mods.map((m) => m.id));

  const mine: MyCourse[] = [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cohort) => {
      const released = mods.filter((m) => m.cohortId === cohort.id && m.releaseDate.getTime() <= now.getTime());
      return {
        cohort,
        enrollment: byCohort.get(cohort.id)!,
        releasedCount: released.length,
        completedCount: released.filter((m) => subs.has(m.id)).length,
      };
    });

  const catalog: CatalogCourse[] = listed
    .filter((c) => !mineIds.includes(c.id))
    .map((cohort) => ({ cohort, requested: byCohort.get(cohort.id)?.status === "requested" }));

  return { mine, catalog };
}

// --- /app/assignments -------------------------------------------------------

export type Assignment = {
  module: Module;
  cohort: Cohort;
  overdue: boolean;
  submittedAt: Date | null;
};
export type StudentAssignments = { open: Assignment[]; completed: Assignment[] };

/** Every OPEN module across active enrollments: what the student owes, then what they've done. */
export async function studentAssignments(student: User): Promise<StudentAssignments> {
  const list = await studentModuleList(student);
  const released = [list.current, ...list.olderReleased].filter((e): e is ModuleListEntry => !!e);
  const subs = await submissionMap(student.id, released.map((e) => e.module.id));
  const all: Assignment[] = released.map((e) => ({
    module: e.module, cohort: e.cohort, overdue: e.overdue, submittedAt: subs.get(e.module.id)?.createdAt ?? null,
  }));
  const dueOrder = (a: Assignment, b: Assignment) => {
    const ad = a.module.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = b.module.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    return ad - bd || compareByRecency(a.module, b.module);
  };
  return {
    open: all.filter((a) => !a.submittedAt).sort(dueOrder),
    completed: all.filter((a) => a.submittedAt).sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime()),
  };
}

/** "3 videos · slides · exercises" — counts derived from material rows. */
export function materialMeta(counts: Record<string, number>): string {
  const parts: string[] = [];
  if (counts.video) parts.push(`${counts.video} video${counts.video === 1 ? "" : "s"}`);
  if (counts.slides) parts.push("slides");
  if (counts.exercises) parts.push("exercises");
  return parts.join(" · ");
}
```

Add to `lib/format.ts`:

```ts
export const formatDue = (d: Date) => `Due ${dayFmt.format(d)} ${timeFmt.format(d)}`;
```

- [ ] **Step 9: Seed**

In `db/seed-data.ts`: import `enrollments`; wipe it (after `sessions`, before `users`); remove `cohortId` from every user insert; capture `eleni`/`petros` rows with `.returning()`; add a third listed cohort; insert enrollments; add due dates to modules; set `blurb`/`isListed` on the cohorts. Concretely:

```ts
// cohorts: add blurb + isListed: true to chem and other; add
const [maths] = await db.insert(cohorts).values({
  name: "Mathematics AA SL 2027", subject: "Mathematics", level: "SL", examYear: 2027,
  blurb: "Analysis & Approaches SL — weekly problem sets with full worked solutions. Starting September.",
  isListed: true,
}).returning();

// after users:
console.log("[seed] enrollments…");
await db.insert(enrollments).values([
  { studentId: nikos.id, cohortId: chem.id, status: "active", decidedAt: new Date(monday - 60 * DAY) },
  { studentId: nikos.id, cohortId: other.id, status: "requested" },          // a pending request → no modules
  { studentId: eleni.id, cohortId: chem.id, status: "active", decidedAt: new Date(monday - 60 * DAY) },
  { studentId: eleni.id, cohortId: other.id, status: "active", decidedAt: new Date(monday - 30 * DAY) }, // two-course student
  { studentId: petros.id, cohortId: chem.id, status: "active", decidedAt: new Date(monday - 60 * DAY) },
]);

// modules: dueDate: defaultDueDate(releaseDate) for every week (import from ../lib/tz)
```

Update the closing console log lines to describe the new states (nikos: HL active + SL requested; eleni: HL + SL active, week 5 overdue; petros: paused). The `maths` cohort has no modules — it exists to be asked-to-join.

- [ ] **Step 10: Admin compile fixes (minimal — the real admin UI is Task 3)**

`app/admin/page.tsx`: replace the `leftJoin(cohorts …)` with a second query over `enrollments` joined to `cohorts`, group by `studentId`, and render the course names in the Cohort column (`"Chemistry HL 2027 (paused)"`). `app/admin/actions.ts` `createStudent`: after inserting the user (use `.returning()`), insert `{ studentId, cohortId, status: "active", decidedAt: new Date() }` into `enrollments` in a `db.transaction`. `app/admin/progress/page.tsx`: replace `students.filter((s) => s.cohortId === cohort.id)` with students whose enrollment in that cohort is `active` or `paused` (load all enrollments once; build `Map<cohortId, Enrollment[]>`); render `(paused)` for a paused enrollment as well as a paused user.

- [ ] **Step 11: Query tests against in-memory PGlite**

Create `lib/queries.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { migrateTestDb } from "./testing/memory-db"; // MUST be imported before @/db-dependent modules are used

let q: typeof import("./queries");
let schema: typeof import("@/db/schema");
let db: Awaited<ReturnType<typeof migrateTestDb>>;

const NOW = Date.now();
const DAY = 86_400_000;

let chem: { id: string }, sl: { id: string }, maths: { id: string };
let nikos: import("@/db/schema").User, eleni: import("@/db/schema").User, petros: import("@/db/schema").User;
let chemW5: { id: string }, chemW7: { id: string }, slW6: { id: string };

beforeAll(async () => {
  db = await migrateTestDb();
  q = await import("./queries");
  schema = await import("@/db/schema");
  const { cohorts, users, modules, enrollments, submissions } = schema;
  [chem, sl, maths] = await db.insert(cohorts).values([
    { name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027, isListed: true },
    { name: "Chemistry SL 2027", subject: "Chemistry", level: "SL", examYear: 2027, isListed: true },
    { name: "Maths AA SL 2027", subject: "Mathematics", level: "SL", examYear: 2027, isListed: true },
  ]).returning();
  [nikos, eleni, petros] = await db.insert(users).values([
    { role: "student", name: "Nikos", username: "nikos", passwordHash: "locked", email: "n@x" },
    { role: "student", name: "Eleni", username: "eleni", passwordHash: "locked", email: "e@x" },
    { role: "student", name: "Petros", username: "petros", passwordHash: "locked", email: "p@x", active: false },
  ]).returning();
  [chemW5, , chemW7] = await db.insert(modules).values([
    { cohortId: chem.id, weekNumber: 5, title: "W5", releaseDate: new Date(NOW - 14 * DAY), dueDate: new Date(NOW - 8 * DAY) },
    { cohortId: chem.id, weekNumber: 6, title: "W6", releaseDate: new Date(NOW - 7 * DAY), dueDate: new Date(NOW + 1 * DAY) },
    { cohortId: chem.id, weekNumber: 7, title: "W7", releaseDate: new Date(NOW + 7 * DAY), dueDate: null },
  ]).returning();
  [slW6] = await db.insert(modules).values([
    { cohortId: sl.id, weekNumber: 6, title: "SL W6", releaseDate: new Date(NOW - 7 * DAY), dueDate: new Date(NOW + 2 * DAY) },
  ]).returning();
  await db.insert(enrollments).values([
    { studentId: nikos.id, cohortId: chem.id, status: "active" },
    { studentId: nikos.id, cohortId: sl.id, status: "requested" },
    { studentId: eleni.id, cohortId: chem.id, status: "active" },
    { studentId: eleni.id, cohortId: sl.id, status: "active" },
    { studentId: petros.id, cohortId: chem.id, status: "active" },
  ]);
  await db.insert(submissions).values({ studentId: nikos.id, moduleId: chemW5.id, note: "done" });
});

describe("studentModuleList — Rule 1 over enrollments", () => {
  it("a single-enrollment student sees exactly the pre-migration picture: 2 open + 1 teaser", async () => {
    const list = await q.studentModuleList(nikos);
    expect(list.current?.module.title).toBe("W6");
    expect(list.olderReleased.map((e) => e.module.title)).toEqual(["W5"]);
    expect(list.future.map((e) => e.module.title)).toEqual(["W7"]);
    expect([list.completedCount, list.releasedCount]).toEqual([1, 2]);
  });
  it("a requested course contributes no modules", async () => {
    const list = await q.studentModuleList(nikos);
    expect(list.olderReleased.concat(list.future).some((e) => e.cohort.id === sl.id)).toBe(false);
    expect(list.activeCohorts.map((c) => c.id)).toEqual([chem.id]);
  });
  it("a two-course student sees both courses' modules", async () => {
    const list = await q.studentModuleList(eleni);
    const titles = [list.current!, ...list.olderReleased].map((e) => e.module.title).sort();
    expect(titles).toEqual(["SL W6", "W5", "W6"]);
    expect(list.activeCohorts).toHaveLength(2);
  });
  it("pausing one enrollment hides only that course", async () => {
    const { enrollments } = schema;
    const { and, eq } = await import("drizzle-orm");
    await db.update(enrollments).set({ status: "paused" })
      .where(and(eq(enrollments.studentId, eleni.id), eq(enrollments.cohortId, sl.id)));
    const list = await q.studentModuleList(eleni);
    const titles = [list.current!, ...list.olderReleased].map((e) => e.module.title).sort();
    expect(titles).toEqual(["W5", "W6"]);
    expect(list.pausedCohorts.map((c) => c.id)).toEqual([sl.id]);
    expect(await q.studentModuleDetail(slW6.id, eleni)).toBeNull();
    await db.update(enrollments).set({ status: "active" })
      .where(and(eq(enrollments.studentId, eleni.id), eq(enrollments.cohortId, sl.id)));
  });
  it("a globally paused student gets nothing (Rule 3)", async () => {
    const list = await q.studentModuleList(petros);
    expect(list.current).toBeNull();
    expect(list.releasedCount).toBe(0);
  });
  it("overdue appears after the due date and clears on submit", async () => {
    const eleniList = await q.studentModuleList(eleni);
    expect(eleniList.olderReleased.find((e) => e.module.id === chemW5.id)?.overdue).toBe(true);
    const nikosList = await q.studentModuleList(nikos);
    expect(nikosList.olderReleased.find((e) => e.module.id === chemW5.id)?.overdue).toBe(false);
    expect(eleniList.current?.overdue).toBe(false); // W6 due tomorrow
  });
});

describe("studentModuleDetail — invisible by direct URL", () => {
  it("404s a requested course's module and a foreign cohort's module", async () => {
    expect(await q.studentModuleDetail(slW6.id, nikos)).toBeNull();
  });
  it("404s a future module and a malformed id", async () => {
    expect(await q.studentModuleDetail(chemW7.id, nikos)).toBeNull();
    expect(await q.studentModuleDetail("not-a-uuid", nikos)).toBeNull();
  });
  it("opens an enrolled, released module", async () => {
    const d = await q.studentModuleDetail(chemW5.id, eleni);
    expect(d?.module.id).toBe(chemW5.id);
    expect(d?.overdue).toBe(true);
  });
});

describe("studentCourses", () => {
  it("splits mine vs catalog and marks requests", async () => {
    const c = await q.studentCourses(nikos);
    expect(c.mine.map((m) => m.cohort.id)).toEqual([chem.id]);
    expect(c.mine[0]).toMatchObject({ releasedCount: 2, completedCount: 1 });
    expect(c.catalog.map((x) => [x.cohort.id, x.requested])).toEqual([
      [sl.id, true],
      [maths.id, false],
    ]);
  });
});

describe("studentAssignments", () => {
  it("lists open modules by due date with overdue flags, completed below", async () => {
    const a = await q.studentAssignments(eleni);
    expect(a.open.map((x) => x.module.title)).toEqual(["W5", "W6", "SL W6"]);
    expect(a.open[0].overdue).toBe(true);
    expect(a.completed).toEqual([]);
    const n = await q.studentAssignments(nikos);
    expect(n.open.map((x) => x.module.title)).toEqual(["W6"]);
    expect(n.completed.map((x) => x.module.title)).toEqual(["W5"]);
  });
});
```

Run: `npm test` — Expected: all green (old 43 + new).

- [ ] **Step 12: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint && npm test`. Fix anything left (module page `studentModuleDetail` consumers still compile: they use `module/cohort/materials/hasSubmission/isCurrent`).

```bash
git add -A db lib app/api app/admin
git commit -m "enrollments: schema + backfill migration, enrollment-based Rule 1, soft deadlines"
```

---

### Task 3: Admin — students' enrollments, requests queue, courses page

**Files:**
- Modify: `app/admin/actions.ts` (add `approveRequest`, `declineRequest`, `setEnrollmentStatus`, `addEnrollment`, `updateCohort`; move nothing)
- Modify: `app/admin/page.tsx` (Courses column with per-enrollment controls + add-to-course; remove the New-cohort card)
- Create: `app/admin/requests/page.tsx`, `app/admin/courses/page.tsx`
- Modify: `app/admin/layout.tsx` (nav: Students · Requests (n) · Courses · Modules · Progress)

**Interfaces:**
- Produces server actions (all `requireAdmin()` first, all `FormData`):
  - `approveRequest(enrollmentId)` → status `active`, `decidedAt = now`
  - `declineRequest(enrollmentId)` → deletes the row iff `status = 'requested'`
  - `setEnrollmentStatus(enrollmentId, status ∈ active|paused|ended)` → `decidedAt = now`
  - `addEnrollment(studentId, cohortId)` → insert `active` or, if a row exists, update it to `active`
  - `updateCohort(id, blurb, isListed)`

- [ ] **Step 1: Actions** — append to `app/admin/actions.ts`:

```ts
import { enrollments } from "@/db/schema"; // add to the existing import
import { isUuid } from "@/lib/validate";

// ---------------------------------------------------------------------------
// Enrollments (SPEC §15.5) — requests queue + per-student course standing.

export async function approveRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  if (isUuid(id)) {
    await db.update(enrollments).set({ status: "active", decidedAt: new Date() })
      .where(and(eq(enrollments.id, id), eq(enrollments.status, "requested")));
  }
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
}

/** Decline = the request disappears; the student may ask again (SPEC §15.7 #7). */
export async function declineRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  if (isUuid(id)) {
    await db.delete(enrollments).where(and(eq(enrollments.id, id), eq(enrollments.status, "requested")));
  }
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
}

const ENROLLMENT_TRANSITIONS = new Set(["active", "paused", "ended"]);

export async function setEnrollmentStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (isUuid(id) && ENROLLMENT_TRANSITIONS.has(status)) {
    await db.update(enrollments)
      .set({ status: status as "active" | "paused" | "ended", decidedAt: new Date() })
      .where(eq(enrollments.id, id));
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function addEnrollment(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "");
  if (isUuid(studentId) && isUuid(cohortId)) {
    const [existing] = await db.select().from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.cohortId, cohortId)));
    if (existing) {
      await db.update(enrollments).set({ status: "active", decidedAt: new Date() }).where(eq(enrollments.id, existing.id));
    } else {
      await db.insert(enrollments).values({ studentId, cohortId, status: "active", decidedAt: new Date() });
    }
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateCohort(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const blurb = String(formData.get("blurb") ?? "").trim() || null;
  const isListed = formData.get("isListed") === "on";
  if (isUuid(id)) await db.update(cohorts).set({ blurb, isListed }).where(eq(cohorts.id, id));
  revalidatePath("/admin/courses");
  redirect("/admin/courses?ok=saved");
}
```

Also change `createCohort` to `redirect("/admin/courses?ok=cohort")` and `revalidatePath("/admin/courses")`.

- [ ] **Step 2: Students page** — in `app/admin/page.tsx` load `allEnrollments` joined with `cohorts`, build `Map<studentId, Array<{enrollment, cohortName}>>`, and render the Courses cell:

```tsx
<td style={td}>
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {(byStudent.get(user.id) ?? []).map(({ enrollment, cohortName }) => (
      <div key={enrollment.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 500 }}>{cohortName}</span>
        <Badge tone={enrollment.status === "active" ? "done" : enrollment.status === "requested" ? "new" : "locked"}>
          {enrollment.status}
        </Badge>
        {enrollment.status !== "requested" && (
          <form action={setEnrollmentStatus} style={{ display: "inline-flex", gap: 4 }}>
            <input type="hidden" name="enrollmentId" value={enrollment.id} />
            {enrollment.status === "active" ? (
              <Button variant="ghost" size="sm" type="submit" name="status" value="paused">Pause</Button>
            ) : (
              <Button variant="ghost" size="sm" type="submit" name="status" value="active">Resume</Button>
            )}
            {enrollment.status !== "ended" && (
              <Button variant="ghost" size="sm" type="submit" name="status" value="ended">End</Button>
            )}
          </form>
        )}
      </div>
    ))}
    <form action={addEnrollment} style={{ display: "flex", gap: 6 }}>
      <input type="hidden" name="studentId" value={user.id} />
      <select className="lmn-input" name="cohortId" required defaultValue="" style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", width: 180 }}>
        <option value="" disabled>Add to course…</option>
        {allCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <Button variant="ghost" size="sm" type="submit">Add</Button>
    </form>
  </div>
</td>
```

`Button` needs `name`/`value` props to pass through for the status buttons — add `name?: string; value?: string` to `Button` in `components/lumen/core.tsx` and spread them on the `<button>`. Remove the "New cohort" card from this page (it moves to `/admin/courses`); keep the Create-student card (its cohort select now creates the first active enrollment).

- [ ] **Step 3: Requests page** — `app/admin/requests/page.tsx`:

```tsx
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, users } from "@/db/schema";
import { Button, Card } from "@/components/lumen/core";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { approveRequest, declineRequest } from "../actions";

// /admin/requests — pending join requests: approve (→ active enrollment) / decline (SPEC §15.5).
export default async function AdminRequests() {
  await requireAdmin();
  const rows = await db
    .select({ enrollment: enrollments, student: users, cohort: cohorts })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(cohorts, eq(cohorts.id, enrollments.cohortId))
    .where(eq(enrollments.status, "requested"))
    .orderBy(asc(enrollments.requestedAt));
  // th/td styles: copy from app/admin/page.tsx
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: "var(--text-heading-sm)", fontWeight: 700, letterSpacing: "var(--tracking-heading-sm)" }}>Join requests</h1>
      <Card padding="0">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Student</th><th style={th}>Course</th><th style={th}>Asked</th><th style={th}>Decision</th></tr></thead>
            <tbody>
              {rows.map(({ enrollment, student, cohort }) => (
                <tr key={enrollment.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{student.name}<span style={{ display: "block", fontWeight: 400, color: "var(--text-tertiary)" }}>{student.email}</span></td>
                  <td style={td}>{cohort.name}</td>
                  <td style={td}>{formatDay(enrollment.requestedAt)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <form action={approveRequest}><input type="hidden" name="enrollmentId" value={enrollment.id} /><Button variant="primary" size="sm" type="submit">Approve</Button></form>
                      <form action={declineRequest}><input type="hidden" name="enrollmentId" value={enrollment.id} /><Button variant="secondary" size="sm" type="submit">Decline</Button></form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td style={{ ...td, color: "var(--text-tertiary)" }} colSpan={4}>No pending requests.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Courses page** — `app/admin/courses/page.tsx`: list every cohort as a Card with an `updateCohort` form (hidden id, `TextArea name="blurb"`, checkbox `isListed` "Listed in the student catalog", Save) + member counts (active/paused/requested from `enrollments`), then the New-cohort form moved verbatim from the old students page. `ok=saved` / `ok=cohort` banners.

- [ ] **Step 5: Admin nav** — in `app/admin/layout.tsx` count pending requests (`select count(*) from enrollments where status='requested'`) and render nav `[Students, `Requests${n ? ` (${n})` : ""}`, Courses, Modules, Progress]`.

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm test`. Start `npm run dev`; as `dimitra`: `/admin/requests` shows nikos → SL; Approve → nikos row on `/admin` shows SL active; Pause eleni's SL → badge paused. `/admin/courses` save a blurb + listing.

```bash
git add app/admin components/lumen/core.tsx
git commit -m "admin: enrollments per student, join-request queue, courses page"
```

---

### Task 4: Admin — module due date field with the Sunday default

**Files:**
- Create: `components/admin/release-due-fields.tsx` (client)
- Modify: `app/admin/actions.ts` (`createModule`, `updateModule` parse `dueDate`), `app/admin/modules/page.tsx`, `app/admin/modules/[id]/page.tsx` (use the component; list shows due date)

- [ ] **Step 1: Component**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/lumen/forms";
import { defaultDueLocal } from "@/lib/tz";

// Release + due date inputs as a pair (SPEC §15.3): the due date defaults to
// the Sunday 23:59 after the release and follows the release until the tutor
// edits it herself. Both are datetime-local = the tutor's wall clock.
export function ReleaseDueFields({ release = "", due = "" }: { release?: string; due?: string }) {
  const [releaseValue, setReleaseValue] = useState(release);
  const [dueValue, setDueValue] = useState(due);
  const [dueTouched, setDueTouched] = useState(due !== "");
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Input label="Release date & time" name="releaseDate" type="datetime-local" required value={releaseValue}
        onChange={(e) => { setReleaseValue(e.target.value); if (!dueTouched) setDueValue(defaultDueLocal(e.target.value)); }}
        style={{ flex: 1, minWidth: 200 }} />
      <Input label="Due (soft deadline — leave empty for none)" name="dueDate" type="datetime-local" value={dueValue}
        onChange={(e) => { setDueTouched(true); setDueValue(e.target.value); }}
        style={{ flex: 1, minWidth: 200 }} />
    </div>
  );
}
```

- [ ] **Step 2: Actions** — in both `createModule` and `updateModule`:

```ts
const dueRaw = String(formData.get("dueDate") ?? "").trim();
const dueDate = dueRaw ? parseLocalInTz(dueRaw) : null;
if (dueDate && Number.isNaN(dueDate.getTime())) redirect(…?error=module / ?error=save);
// include dueDate in .values / .set; carry `dueDate: dueRaw` in the week-taken URLSearchParams
```

- [ ] **Step 3: Pages** — replace the release `Input` (and its wrapping flex div's second child) with `<ReleaseDueFields release={carried.releaseDate ?? ""} due={carried.dueDate ?? ""} />` on create and `<ReleaseDueFields release={carried.releaseDate ?? local} due={carried.dueDate ?? (module.dueDate ? toLocalInputValue(module.dueDate) : "")} />` on edit. Add `dueDate?: string` to both `searchParams` types. In the modules list, after the release badge, render `{m.dueDate && <Badge tone="neutral" icon="flag">Due {formatDay(m.dueDate)}</Badge>}`.

- [ ] **Step 4: Verify + commit** — typecheck/lint/test; in the browser, type a Monday release → due auto-fills to Sunday 23:59; save; reopen shows it.

```bash
git add app/admin components/admin/release-due-fields.tsx
git commit -m "admin: module due date with the Sunday-23:59 default"
```

---

### Task 5: Student shell — single header with the nav

**Files:**
- Create: `components/app/student-nav.tsx` (client, `usePathname`)
- Modify: `app/app/layout.tsx` (one responsive header instead of two)
- Modify: `DESIGN.md` §5 (DeskNav links now built), §8 (remove "DeskNav page links" from deferred), §9 (#6 note)

- [ ] **Step 1: Nav component**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// DESIGN.md §5 DeskNav link recipe: body 500, 8×12 pad, active text-primary,
// rest text-tertiary. One component, mounted once in app/app/layout.tsx.
const ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/courses", label: "Courses" },
  { href: "/app/assignments", label: "Assignments" },
];

export function StudentNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" || pathname.startsWith("/app/modules") : pathname.startsWith(href);
  return (
    <nav aria-label="Student" style={{ display: "flex", gap: 4, overflowX: "auto" }}>
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            style={{ fontSize: "var(--text-body-sm)", fontWeight: 500, letterSpacing: "var(--tracking-body-sm)",
              color: active ? "var(--text-primary)" : "var(--text-tertiary)", padding: "8px 12px",
              borderRadius: "var(--radius-pills)", background: active ? "var(--surface-page)" : "transparent", whiteSpace: "nowrap" }}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Layout** — replace the two headers with one:

```tsx
<header style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-card)" }}>
  <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap"
    style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 20px", paddingTop: "calc(12px + env(safe-area-inset-top))" }}>
    <span style={{ flex: 1, display: "inline-flex" }} className="lg:flex-none"><Wordmark size="sm" /></span>
    <div className="order-last basis-full lg:order-none lg:basis-auto lg:flex-1" style={{ marginTop: 4 }}><StudentNav /></div>
    {signOutButton}
    {avatar}
  </div>
</header>
```

(`lg:` utilities come from Tailwind 4 already in use; the order/basis classes let the nav drop to a second row under 1024px.)

- [ ] **Step 3: Verify + commit** — `npm run typecheck && npm run lint`; at 390px the nav wraps to its own row and scrolls if needed; at 1280px it sits inline. Update DESIGN.md as listed.

```bash
git add components/app/student-nav.tsx app/app/layout.tsx DESIGN.md
git commit -m "app: single student header with Home / Courses / Assignments nav"
```

---

### Task 6: `/app` dashboard — due date, overdue badges, course labels

**Files:**
- Modify: `components/lumen/core.tsx` (Badge tone `alert`), `components/lumen/learning.tsx` (ModuleCard `badges` + `due` props), `app/app/page.tsx`, `app/app/modules/[id]/page.tsx` (Overdue badge in the badge row)

- [ ] **Step 1: Badge tone** — add to `badgeTones`: `alert: { background: "rgba(196,50,10,.08)", color: "#c4320a", border: "1px solid transparent" }` (derived from DESIGN.md's documented error literal `#c4320a`; record it in DESIGN.md §5 Badge).

- [ ] **Step 2: ModuleCard** — add props `badges?: ReactNode` (rendered after the New badge in the header row) and `due?: string` (rendered as a caption line between meta and the CTA: caption 500, text-tertiary).

- [ ] **Step 3: Page** — in `app/app/page.tsx`:
  - hero: `due={hero.module.dueDate ? formatDue(hero.module.dueDate) : undefined}` and `badges={hero.overdue && <Badge tone="alert" icon="schedule">Overdue</Badge>}`;
  - `weekRow` open-not-completed: `meta` = `[multi ? entry.cohort.name : null, entry.module.dueDate ? formatDue(entry.module.dueDate) : "Open — attempt not sent yet"].filter(Boolean).join(" · ")`, `trailing={entry.overdue ? <Badge tone="alert">Overdue</Badge> : undefined}`; where `multi = list.activeCohorts.length > 1`. Completed rows and teasers: prefix the cohort name the same way when `multi`.
  - empty hero: if `list.pausedCohorts.length > 0 && list.activeCohorts.length === 0` → Card text "Your course is paused — talk to Dimitra to continue."; if no enrollments at all → "You're not in a course yet — browse the catalog and ask to join." with a secondary Button to `/app/courses`.
  - hero `week` label prefix with cohort name when `multi`: `` `${hero.cohort.name} · Week ${n} · This week` ``.

- [ ] **Step 4: Module page** — add `{overdue && <Badge tone="alert" icon="schedule">Overdue</Badge>}` to the badge row and show `formatDue(module.dueDate)` as a caption under the title when set.

- [ ] **Step 5: Verify + commit** — typecheck/lint/test; as `eleni` (two courses) `/app` lists both courses' weeks with names; W5 shows Overdue; submit W5 → badge gone. As `nikos` the page matches the pre-migration layout exactly (no course names, same rows).

```bash
git add components/lumen app/app/page.tsx "app/app/modules/[id]/page.tsx" DESIGN.md
git commit -m "app: due dates and overdue badges on the dashboard and module page"
```

---

### Task 7: `/app/courses` + "Ask to join"

**Files:**
- Create: `app/app/actions.ts` (`requestToJoin`), `app/app/courses/page.tsx`

- [ ] **Step 1: Action**

```ts
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cohorts, enrollments } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { requireStudent } from "@/lib/student";
import { isUuid } from "@/lib/validate";

/** "Ask to join" (SPEC §15.1): creates a request Dimitra approves in /admin/requests. */
export async function requestToJoin(formData: FormData) {
  const user = await requireStudent();
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!isUuid(cohortId)) redirect("/app/courses");
  const [cohort] = await db.select().from(cohorts).where(and(eq(cohorts.id, cohortId), eq(cohorts.isListed, true)));
  if (!cohort) redirect("/app/courses"); // unlisted cohorts can't be asked for, even by crafted POST
  const [existing] = await db.select().from(enrollments)
    .where(and(eq(enrollments.studentId, user.id), eq(enrollments.cohortId, cohort.id)));
  if (!existing) {
    try {
      await db.insert(enrollments).values({ studentId: user.id, cohortId: cohort.id, status: "requested" });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // double-submit race: the first request stands
    }
  } else if (existing.status === "ended") {
    await db.update(enrollments).set({ status: "requested", requestedAt: new Date(), decidedAt: null })
      .where(eq(enrollments.id, existing.id));
  }
  revalidatePath("/app/courses");
  redirect("/app/courses?ok=requested");
}
```

- [ ] **Step 2: Page** — `app/app/courses/page.tsx` (server component; `requireStudent`; `studentCourses`). Layout: h1 "Courses" (heading, 8px top) → section label "My courses" (body-sm 700) → one white `Card` per `mine` entry: cohort name (heading-sm 700), meta `"{subject} {level} · Class of {examYear}"` caption, then either `ProgressBar value=completed total=released label="{c} of {r} modules"` + primary `Button href="/app"` "Open modules" (active) or `Badge tone="locked" icon="pause"` "Paused" + body-sm "Paused — talk to Dimitra to continue." (paused) → section "Catalog" → one `Card` per catalog entry: name, blurb (body-sm), then `<form action={requestToJoin}><input type=hidden name=cohortId …/><Button variant="dark" size="sm" type="submit">Ask to join</Button></form>` or `<Button variant="secondary" size="sm" disabled>Requested</Button>`. `ok=requested` → `Card` banner "Request sent — Dimitra will confirm your place." Empty states: "You're not in a course yet." / "No other courses are open right now." Mobile: `padding: "8px 20px 24px"`, column gap 16; desktop: 1040px shell with `repeat(auto-fit, minmax(300px, 1fr))` grid of cards.

- [ ] **Step 3: Verify + commit** — as `nikos`: SL shows "Requested", Maths shows "Ask to join" → click → "Requested" + banner; as `eleni`: two cards under My courses; pause her SL in admin → card says paused. Direct POST for an unlisted cohort id does nothing.

```bash
git add app/app/actions.ts app/app/courses
git commit -m "app: courses page — my courses and the catalog with Ask to join"
```

---

### Task 8: `/app/assignments`

**Files:**
- Create: `app/app/assignments/page.tsx`

- [ ] **Step 1: Page** — `requireStudent`; `studentAssignments`; h1 "Assignments"; section "To do": `ListRow` per open item: `icon="edit_note"` subject color, label `Week {n} — {title}`, meta `[multi ? cohort.name : null, dueDate ? formatDue(dueDate) : "No due date"].join(" · ")`, `trailing={overdue ? <Badge tone="alert">Overdue</Badge> : undefined}`, `href=/app/modules/{id}`; empty → `Card` "Nothing due — enjoy the breather." Section "Completed": `ListRow` `icon="check_circle"`, meta `Sent {formatDay(submittedAt)}`, `trailing=<Badge tone="done" icon="check">Done</Badge>`, `chevron={false}`. Both sections stack on mobile; desktop uses the 1.6fr/1fr grid (to-do left, completed right).

- [ ] **Step 2: Verify + commit** — as `eleni`: W5 (overdue), W6, SL W6 in that order; submit W5 → moves to Completed, badge gone.

```bash
git add app/app/assignments
git commit -m "app: assignments page — what I owe, then what I've done"
```

---

### Task 9: Docs, verification walk, push

**Files:**
- Modify: `README.md` (seed-account table, "How it hangs together", scripts line for `npm test`), `PROJECT_REPORT.md` (§4 rules, §5 data model, §7/§8 pages, §12 API/actions, §14 counts), `DESIGN.md` (already touched), `SPEC.md` §15.6 checkboxes

- [ ] **Step 1:** Update the docs to describe the shipped state (no aspirational claims).
- [ ] **Step 2:** Full verification: `npm test && npm run typecheck && npm run lint && npm run build`; then `npm run dev` and walk SPEC §15.6 M6 as the three seeded students + admin; screenshot `/app`, `/app/courses`, `/app/assignments` at 390px and 1280px if a Chromium binary is available, otherwise state that the visual pass was done via DOM/HTTP only.
- [ ] **Step 3:** Tick the M6 boxes in SPEC.md §15.6 **only for items actually verified**.
- [ ] **Step 4:** Commit and push:

```bash
git add README.md PROJECT_REPORT.md SPEC.md DESIGN.md
git commit -m "docs: M6 verified — enrollments, catalog, deadlines"
git push origin claude/lumen-platform-orient-tc7fma
```
