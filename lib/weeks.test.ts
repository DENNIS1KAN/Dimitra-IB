import { beforeAll, describe, expect, it } from "vitest";
// Installs the in-memory PGlite BEFORE "@/db" is evaluated (see the helper).
import { migrateTestDb } from "./testing/memory-db";

// The hard rule of M13 (SPEC §15.7 #27): a week with submissions can never
// be deleted. Exercised against real SQL, with a recording storage stub so
// the assertions can see exactly which files a delete would have removed.

type Schema = typeof import("@/db/schema");
let deleteWeek: typeof import("./weeks").deleteWeek;
let schema: Schema;
let db: Awaited<ReturnType<typeof migrateTestDb>>;

const NOW = Date.now();
const DAY = 86_400_000;

let chem: { id: string };
let nikos: Schema["users"]["$inferSelect"];
let submitted: { id: string }, empty: { id: string }, linkOnly: { id: string };

const removed: string[] = [];
const recorder = {
  delete: async (key: string) => {
    removed.push(key);
  },
};

beforeAll(async () => {
  db = await migrateTestDb();
  ({ deleteWeek } = await import("./weeks"));
  schema = await import("@/db/schema");
  const { cohorts, users, modules, materials, events } = schema;
  [chem] = await db
    .insert(cohorts)
    .values([{ name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027 }])
    .returning();
  [nikos] = await db
    .insert(users)
    .values([{ role: "student", name: "Nikos", username: "nikos", passwordHash: "x", email: "n@x" }])
    .returning();
  [submitted, empty, linkOnly] = await db
    .insert(modules)
    .values([
      { cohortId: chem.id, weekNumber: 5, title: "Energetics", releaseDate: new Date(NOW - 14 * DAY) },
      { cohortId: chem.id, weekNumber: 8, title: "Mechanisms I", releaseDate: new Date(NOW + 14 * DAY) },
      { cohortId: chem.id, weekNumber: 9, title: "Mechanisms II", releaseDate: new Date(NOW + 21 * DAY) },
    ])
    .returning();

  const [w5video] = await db
    .insert(materials)
    .values([
      { moduleId: submitted.id, type: "video", title: "W5 video", storageKey: "m/w5.mp4", sortOrder: 0 },
      { moduleId: empty.id, type: "video", title: "W8 video", storageKey: "m/w8.mp4", sortOrder: 0 },
      { moduleId: empty.id, type: "slides", title: "W8 slides", storageKey: "m/w8.pdf", sortOrder: 1 },
      { moduleId: linkOnly.id, type: "video", title: "W9 link", externalUrl: "https://www.loom.com/share/abcdefghij", sortOrder: 0 },
    ])
    .returning();
  // An event on a material, so the delete has to survive the cascade chain.
  await db
    .insert(events)
    .values({ studentId: nikos.id, materialId: w5video.id, type: "view" });
  await db.insert(schema.submissions).values({ studentId: nikos.id, moduleId: submitted.id });
});

const stillThere = async (id: string) =>
  (await db.select().from(schema.modules)).some((m) => m.id === id);

describe("deleteWeek", () => {
  it("refuses a week that holds student work, and touches nothing", async () => {
    const result = await deleteWeek(submitted.id, recorder);
    expect(result).toEqual({ ok: false, reason: "has-submissions", submitted: 1 });
    expect(removed).toEqual([]);
    expect(await stillThere(submitted.id)).toBe(true);
  });

  it("removes an empty week, its materials rows and its stored files", async () => {
    const result = await deleteWeek(empty.id, recorder);
    expect(result).toEqual({ ok: true, cohortId: chem.id, filesRemoved: 2 });
    expect(removed.sort()).toEqual(["m/w8.mp4", "m/w8.pdf"]);
    expect(await stillThere(empty.id)).toBe(false);
    const leftovers = await db.select().from(schema.materials);
    expect(leftovers.some((m) => m.moduleId === empty.id)).toBe(false);
  });

  it("has no file to remove for a link video", async () => {
    removed.length = 0;
    const result = await deleteWeek(linkOnly.id, recorder);
    expect(result).toEqual({ ok: true, cohortId: chem.id, filesRemoved: 0 });
    expect(removed).toEqual([]);
  });

  it("reports a missing or malformed id rather than throwing", async () => {
    expect(await deleteWeek("not-a-uuid", recorder)).toEqual({ ok: false, reason: "not-found" });
    expect(await deleteWeek("00000000-0000-4000-8000-000000000000", recorder)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
