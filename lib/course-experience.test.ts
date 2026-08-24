import { beforeAll, describe, expect, it } from "vitest";
// Installs the in-memory PGlite BEFORE "@/db" is evaluated (see the helper).
import { migrateTestDb } from "./testing/memory-db";

// M13 (SPEC §15.7 #27) through the real queries against real SQL: events in,
// a resume card and a week's path out.

type Schema = typeof import("@/db/schema");
let q: typeof import("./queries");
let schema: Schema;
let db: Awaited<ReturnType<typeof migrateTestDb>>;

const NOW = Date.now();
const DAY = 86_400_000;

let chem: { id: string };
let nikos: Schema["users"]["$inferSelect"];
let w5: { id: string }, w6: { id: string };
let w5Video: { id: string }, w6VideoA: { id: string }, w6VideoB: { id: string };
let w6Exercises: { id: string }, w6Solutions: { id: string };

beforeAll(async () => {
  db = await migrateTestDb();
  q = await import("./queries");
  schema = await import("@/db/schema");
  const { cohorts, users, modules, materials, enrollments } = schema;
  [chem] = await db
    .insert(cohorts)
    .values([{ name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027 }])
    .returning();
  [nikos] = await db
    .insert(users)
    .values([{ role: "student", name: "Nikos", username: "nikos", passwordHash: "x", email: "n@x" }])
    .returning();
  [w5, w6] = await db
    .insert(modules)
    .values([
      { cohortId: chem.id, weekNumber: 5, title: "Energetics", releaseDate: new Date(NOW - 14 * DAY) },
      { cohortId: chem.id, weekNumber: 6, title: "Buffers", releaseDate: new Date(NOW - 7 * DAY) },
      { cohortId: chem.id, weekNumber: 7, title: "Redox", releaseDate: new Date(NOW + 7 * DAY) },
    ])
    .returning();
  await db.insert(enrollments).values({ studentId: nikos.id, cohortId: chem.id, status: "active" });

  // W5 is a single link video; W6 is two uploaded videos plus the paper work.
  [w5Video] = await db
    .insert(materials)
    .values([
      {
        moduleId: w5.id,
        type: "video",
        title: "Born-Haber walkthrough",
        externalUrl: "https://www.loom.com/share/abcdefghij",
        sortOrder: 0,
      },
    ])
    .returning();
  [w6VideoA, w6VideoB, w6Exercises, w6Solutions] = await db
    .insert(materials)
    .values([
      { moduleId: w6.id, type: "video", title: "Buffer systems", storageKey: "k/a.mp4", durationSeconds: 600, sortOrder: 0 },
      { moduleId: w6.id, type: "video", title: "Titration curves", storageKey: "k/b.mp4", durationSeconds: 900, sortOrder: 1 },
      { moduleId: w6.id, type: "exercises", title: "Set A", storageKey: "k/e.pdf", sortOrder: 2 },
      { moduleId: w6.id, type: "solutions", title: "Worked solutions", storageKey: "k/s.pdf", sortOrder: 3 },
    ])
    .returning();
});

const courseDetail = () => q.studentCourseDetail(chem.id, nikos);
const weekDetail = (moduleId: string) => q.studentModuleDetail(moduleId, nikos);

describe("the course page's resume card", () => {
  it("reads Continue week N before any event exists", async () => {
    const detail = (await courseDetail())!;
    expect(detail.resume).not.toBeNull();
    // W5 is the earliest unfinished released week, and its link video is first.
    expect(detail.resume!.weekNumber).toBe(5);
    expect(detail.resume!.cta).toBe("Continue week 5");
    expect(detail.resume!.href).toBe(`/app/modules/${w5.id}/watch/${w5Video.id}`);
  });

  it("completes a link video on its view event, with no position to resume", async () => {
    await db
      .insert(schema.events)
      .values({ studentId: nikos.id, materialId: w5Video.id, type: "view" });
    const week5 = (await weekDetail(w5.id))!;
    expect(week5.plan.steps[0].state).toBe("done");
    expect(week5.plan.steps[0].resumeSeconds).toBe(0);
    // W5 has no exercises file, so Attempt has nothing to wait for.
    expect(week5.plan.steps.find((s) => s.kind === "attempt")!.state).toBe("done");
    expect(week5.plan.current!.kind).toBe("submit");
  });

  it("resumes the exact uploaded video at the highest saved second", async () => {
    // W5 is finished off so the card moves to W6.
    await db.insert(schema.submissions).values({ studentId: nikos.id, moduleId: w5.id });
    await db.insert(schema.events).values([
      { studentId: nikos.id, materialId: w6VideoA.id, type: "video_progress", value: 30 },
      { studentId: nikos.id, materialId: w6VideoA.id, type: "video_progress", value: 12 },
    ]);
    const detail = (await courseDetail())!;
    expect(detail.resume!.mode).toBe("resume");
    expect(detail.resume!.weekNumber).toBe(6);
    expect(detail.resume!.cta).toBe("Resume");
    expect(detail.resume!.href).toBe(`/app/modules/${w6.id}/watch/${w6VideoA.id}`);
    // The highest value wins, not the latest row.
    expect(detail.resume!.meta).toContain("10 minutes left");
    expect((await weekDetail(w6.id))!.plan.steps[0].resumeSeconds).toBe(30);
  });

  it("advances step by step as the events and the submission land", async () => {
    const kinds = async () => (await weekDetail(w6.id))!.plan.current?.kind ?? null;
    expect(await kinds()).toBe("video"); // still on video 1

    await db
      .insert(schema.events)
      .values({ studentId: nikos.id, materialId: w6VideoA.id, type: "video_progress", value: 600 });
    expect((await weekDetail(w6.id))!.plan.current!.key).toBe(w6VideoB.id);

    await db
      .insert(schema.events)
      .values({ studentId: nikos.id, materialId: w6VideoB.id, type: "video_progress", value: 895 });
    expect(await kinds()).toBe("attempt");

    await db
      .insert(schema.events)
      .values({ studentId: nikos.id, materialId: w6Exercises.id, type: "download" });
    expect(await kinds()).toBe("submit");
  });

  it("unlocks the solutions step on submit, and nothing before it", async () => {
    const before = (await weekDetail(w6.id))!.plan.steps.find((s) => s.kind === "solutions")!;
    expect(before.state).toBe("locked");
    expect(before.href).toBeNull();

    await db.insert(schema.submissions).values({ studentId: nikos.id, moduleId: w6.id });
    const after = (await weekDetail(w6.id))!.plan.steps.find((s) => s.kind === "solutions")!;
    expect(after.state).toBe("done");
    expect(after.href).toBe(`/api/materials/${w6Solutions.id}`);
  });

  it("offers a review once every released week is finished", async () => {
    const detail = (await courseDetail())!;
    expect(detail.resume!.mode).toBe("review");
    expect(detail.resume!.cta).toBe("Review week 6");
    // The unreleased week never enters the path.
    expect(detail.rows.find((r) => r.module.weekNumber === 7)!.plan).toBeNull();
  });
});
