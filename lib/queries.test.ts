import { beforeAll, describe, expect, it } from "vitest";
// Installs the in-memory PGlite BEFORE "@/db" is evaluated (see the helper).
import { migrateTestDb } from "./testing/memory-db";

// Rule 1 over enrollments, exercised through the real queries against real
// SQL — the M6 checklist (SPEC §15.6) at the query layer.

type Schema = typeof import("@/db/schema");
let q: typeof import("./queries");
let schema: Schema;
let db: Awaited<ReturnType<typeof migrateTestDb>>;

const NOW = Date.now();
const DAY = 86_400_000;

let chem: { id: string }, sl: { id: string }, maths: { id: string };
let nikos: Schema["users"]["$inferSelect"];
let eleni: Schema["users"]["$inferSelect"];
let petros: Schema["users"]["$inferSelect"];
let chemW5: { id: string }, chemW7: { id: string }, slW6: { id: string };

beforeAll(async () => {
  db = await migrateTestDb();
  q = await import("./queries");
  schema = await import("@/db/schema");
  const { cohorts, users, modules, enrollments, submissions } = schema;
  [chem, sl, maths] = await db
    .insert(cohorts)
    .values([
      { name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027, isListed: true },
      { name: "Chemistry SL 2027", subject: "Chemistry", level: "SL", examYear: 2027, isListed: true },
      { name: "Maths AA SL 2027", subject: "Mathematics", level: "SL", examYear: 2027, isListed: true },
      { name: "Unlisted Physics", subject: "Physics", level: "HL", examYear: 2027, isListed: false },
    ])
    .returning();
  [nikos, eleni, petros] = await db
    .insert(users)
    .values([
      { role: "student", name: "Nikos", username: "nikos", passwordHash: "locked", email: "n@x" },
      { role: "student", name: "Eleni", username: "eleni", passwordHash: "locked", email: "e@x" },
      { role: "student", name: "Petros", username: "petros", passwordHash: "locked", email: "p@x", active: false },
    ])
    .returning();
  [chemW5, , chemW7] = await db
    .insert(modules)
    .values([
      { cohortId: chem.id, weekNumber: 5, title: "W5", releaseDate: new Date(NOW - 14 * DAY) },
      { cohortId: chem.id, weekNumber: 6, title: "W6", releaseDate: new Date(NOW - 7 * DAY) },
      { cohortId: chem.id, weekNumber: 7, title: "W7", releaseDate: new Date(NOW + 7 * DAY) },
    ])
    .returning();
  [slW6] = await db
    .insert(modules)
    .values([
      { cohortId: sl.id, weekNumber: 6, title: "SL W6", releaseDate: new Date(NOW - 7 * DAY) },
    ])
    .returning();
  await db.insert(enrollments).values([
    { studentId: nikos.id, cohortId: chem.id, status: "active" },
    { studentId: nikos.id, cohortId: sl.id, status: "requested" },
    { studentId: eleni.id, cohortId: chem.id, status: "active" },
    { studentId: eleni.id, cohortId: sl.id, status: "active" },
    { studentId: petros.id, cohortId: chem.id, status: "active" },
  ]);
  await db.insert(submissions).values({ studentId: nikos.id, moduleId: chemW5.id, note: "done" });
}, 30_000); // migrates a fresh in-memory PGlite — slow on a loaded machine

const releasedTitles = (list: Awaited<ReturnType<typeof q.studentModuleList>>) =>
  [list.current, ...list.olderReleased]
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map((e) => e.module.title)
    .sort();

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
    expect([...list.olderReleased, ...list.future].some((e) => e.cohort.id === sl.id)).toBe(false);
    expect(list.activeCohorts.map((c) => c.id)).toEqual([chem.id]);
  });

  it("a two-course student sees both courses' modules", async () => {
    const list = await q.studentModuleList(eleni);
    expect(releasedTitles(list)).toEqual(["SL W6", "W5", "W6"]);
    expect(list.activeCohorts).toHaveLength(2);
  });

  it("hero tie-break: same-day releases resolve by course title A-Z (SPEC §15.7 #16)", async () => {
    // W6 (Chemistry HL 2027) and SL W6 (Chemistry SL 2027) were released the
    // same instant; HL sorts before SL alphabetically.
    const list = await q.studentModuleList(eleni);
    expect(list.current?.module.title).toBe("W6");
    expect(list.olderReleased.map((e) => e.module.title)).toEqual(["SL W6", "W5"]);
  });

  it("pausing one enrollment hides only that course", async () => {
    const { enrollments } = schema;
    const { and, eq } = await import("drizzle-orm");
    const eleniSl = and(eq(enrollments.studentId, eleni.id), eq(enrollments.cohortId, sl.id));
    await db.update(enrollments).set({ status: "paused" }).where(eleniSl);
    try {
      const list = await q.studentModuleList(eleni);
      expect(releasedTitles(list)).toEqual(["W5", "W6"]);
      expect(list.pausedCohorts.map((c) => c.id)).toEqual([sl.id]);
      expect(await q.studentModuleDetail(slW6.id, eleni)).toBeNull();
      expect(await q.studentModuleDetail(chemW5.id, eleni)).not.toBeNull();
    } finally {
      await db.update(enrollments).set({ status: "active" }).where(eleniSl);
    }
  });

  it("a globally paused student gets nothing (Rule 3)", async () => {
    const list = await q.studentModuleList(petros);
    expect(list.current).toBeNull();
    expect(list.releasedCount).toBe(0);
    expect(await q.studentModuleDetail(chemW5.id, petros)).toBeNull();
  });
});

describe("studentModuleDetail — invisible by direct URL", () => {
  it("404s a requested course's module (and so any foreign cohort)", async () => {
    expect(await q.studentModuleDetail(slW6.id, nikos)).toBeNull();
  });

  it("404s a future module and a malformed id", async () => {
    expect(await q.studentModuleDetail(chemW7.id, nikos)).toBeNull();
    expect(await q.studentModuleDetail("not-a-uuid", nikos)).toBeNull();
  });

  it("opens an enrolled, released module", async () => {
    const d = await q.studentModuleDetail(chemW5.id, eleni);
    expect(d?.module.id).toBe(chemW5.id);
    expect(d?.hasSubmission).toBe(false);
  });
});

describe("studentCourses", () => {
  it("splits mine vs catalog, marks requests, hides unlisted cohorts", async () => {
    const c = await q.studentCourses(nikos);
    expect(c.mine.map((m) => m.cohort.id)).toEqual([chem.id]);
    expect(c.mine[0]).toMatchObject({ releasedCount: 2, completedCount: 1 });
    expect(c.mine[0].enrollment.status).toBe("active");
    expect(c.catalog.map((x) => [x.cohort.id, x.requested])).toEqual([
      [sl.id, true],
      [maths.id, false],
    ]);
  });

  it("a two-course student has two cards and only Maths left in the catalog", async () => {
    const c = await q.studentCourses(eleni);
    expect(c.mine.map((m) => m.cohort.id)).toEqual([chem.id, sl.id]);
    expect(c.catalog.map((x) => x.cohort.id)).toEqual([maths.id]);
  });
});

describe("studentAssignments", () => {
  it("lists released-not-submitted modules newest first, completed below", async () => {
    const a = await q.studentAssignments(eleni);
    expect(a.open.map((x) => x.module.title)).toEqual(["W6", "SL W6", "W5"]);
    expect(a.completed).toEqual([]);
    const n = await q.studentAssignments(nikos);
    expect(n.open.map((x) => x.module.title)).toEqual(["W6"]);
    expect(n.completed.map((x) => x.module.title)).toEqual(["W5"]);
    expect(n.completed[0].submittedAt).toBeInstanceOf(Date);
  });
});
