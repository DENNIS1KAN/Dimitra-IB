import { beforeAll, describe, expect, it } from "vitest";
import { migrateTestDb } from "./testing/memory-db";
import { hashPassword, verifyPassword } from "./password";

type Schema = typeof import("@/db/schema");
type User = Schema["users"]["$inferSelect"];
let a: typeof import("./account");
let auth: typeof import("./auth");
let schema: Schema;
let db: Awaited<ReturnType<typeof migrateTestDb>>;
let nikos: User, eleni: User;

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const hashOf = async (id: string) =>
  (await db.select({ h: schema.users.passwordHash }).from(schema.users).where((await import("drizzle-orm")).eq(schema.users.id, id)))[0].h;

beforeAll(async () => {
  db = await migrateTestDb();
  a = await import("./account");
  auth = await import("./auth");
  schema = await import("@/db/schema");
  [nikos, eleni] = await db
    .insert(schema.users)
    .values([
      { role: "student", name: "Nikos", username: "nikos", passwordHash: hashPassword("lumen123"), email: "n@x" },
      { role: "student", name: "Eleni", username: "eleni", passwordHash: hashPassword("lumen123"), email: "e@x" },
    ])
    .returning();
}, 30_000); // migrates a fresh in-memory PGlite — slow on a loaded machine

describe("change own password (SPEC §15.4: current + new, min 8, same scrypt path)", () => {
  it("rejects a wrong current password and leaves the hash unchanged", async () => {
    const before = await hashOf(nikos.id);
    expect(await a.changeOwnPassword(nikos, form({ current: "nope-nope", next: "brandnew1" }))).toEqual({
      ok: false,
      reason: "wrong-current",
    });
    expect(await hashOf(nikos.id)).toBe(before);
  });

  it("rejects a new password under 8 characters", async () => {
    expect(await a.changeOwnPassword(nikos, form({ current: "lumen123", next: "short" }))).toEqual({
      ok: false,
      reason: "too-short",
    });
    expect(verifyPassword("lumen123", await hashOf(nikos.id))).toBe(true);
  });

  it("changes only the actor's password: old stops working, new works, others untouched", async () => {
    expect(await a.changeOwnPassword(nikos, form({ current: "lumen123", next: "brandnew1" }))).toEqual({ ok: true });
    const h = await hashOf(nikos.id);
    expect(h.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("lumen123", h)).toBe(false);
    expect(verifyPassword("brandnew1", h)).toBe(true);
    expect(verifyPassword("lumen123", await hashOf(eleni.id))).toBe(true);
  });
});

describe("revoking other sessions after a password change", () => {
  it("keeps the current session and removes the user's others only", async () => {
    const far = new Date(Date.now() + 86_400_000);
    await db.insert(schema.sessions).values([
      { token: "keep", userId: nikos.id, expiresAt: far },
      { token: "old-phone", userId: nikos.id, expiresAt: far },
      { token: "eleni-s", userId: eleni.id, expiresAt: far },
    ]);
    await auth.deleteSessionsExcept(nikos.id, "keep");
    const left = (await db.select({ t: schema.sessions.token }).from(schema.sessions)).map((r) => r.t).sort();
    expect(left).toEqual(["eleni-s", "keep"]);
  });
});
