import { beforeAll, describe, expect, it } from "vitest";
import { migrateTestDb } from "./testing/memory-db";

type Schema = typeof import("@/db/schema");
type User = Schema["users"]["$inferSelect"];
let sub: typeof import("./submissions");
let db: Awaited<ReturnType<typeof migrateTestDb>>;
let admin: User, nikos: User, eleni: User;
let submissionId: string;

beforeAll(async () => {
  db = await migrateTestDb();
  sub = await import("./submissions");
  const schema = await import("@/db/schema");
  const [chem] = await db
    .insert(schema.cohorts)
    .values({ name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027 })
    .returning();
  [admin, nikos, eleni] = await db
    .insert(schema.users)
    .values([
      { role: "admin", name: "Dimitra", username: "dimitra", passwordHash: "locked", email: "d@x" },
      { role: "student", name: "Nikos", username: "nikos", passwordHash: "locked", email: "n@x" },
      { role: "student", name: "Eleni", username: "eleni", passwordHash: "locked", email: "e@x" },
    ])
    .returning();
  const [w5] = await db
    .insert(schema.modules)
    .values({ cohortId: chem.id, weekNumber: 5, title: "Energetics", releaseDate: new Date(0) })
    .returning();
  const [s] = await db
    .insert(schema.submissions)
    .values({ studentId: nikos.id, moduleId: w5.id, fileKey: "submissions/x/y.png", note: "my working" })
    .returning();
  submissionId = s.id;
}, 30_000); // migrates a fresh in-memory PGlite — slow on a loaded machine

describe("admin-only submission read (SPEC §15.5)", () => {
  it("returns the submission with its student, module and cohort for an admin", async () => {
    const r = await sub.adminSubmission(admin, submissionId);
    expect(r?.student.name).toBe("Nikos");
    expect(r?.module.title).toBe("Energetics");
    expect(r?.cohort.name).toBe("Chemistry HL 2027");
    expect(r?.submission.note).toBe("my working");
    expect(r?.submission.fileKey).toBe("submissions/x/y.png");
  });

  it("null for unknown or malformed ids", async () => {
    expect(await sub.adminSubmission(admin, "00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await sub.adminSubmission(admin, "nope")).toBeNull();
  });

  it("students can never read a submission back — not even their own", async () => {
    await expect(sub.adminSubmission(nikos, submissionId)).rejects.toThrow(/not-admin/);
    await expect(sub.adminSubmission(eleni, submissionId)).rejects.toThrow(/not-admin/);
  });
});

describe("content type by storage key", () => {
  it("maps known extensions and defaults to octet-stream", async () => {
    const { contentTypeFor } = await import("./content-type");
    expect(contentTypeFor("submissions/a/b.png")).toBe("image/png");
    expect(contentTypeFor("x.JPG")).toBe("image/jpeg");
    expect(contentTypeFor("x.pdf")).toBe("application/pdf");
    expect(contentTypeFor("x.heic")).toBe("image/heic");
    expect(contentTypeFor("x.bin")).toBe("application/octet-stream");
  });
});
