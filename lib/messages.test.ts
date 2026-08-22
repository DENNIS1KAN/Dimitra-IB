import { beforeAll, describe, expect, it } from "vitest";
// Installs the in-memory PGlite BEFORE "@/db" is evaluated (see the helper).
import { migrateTestDb } from "./testing/memory-db";

// M7 authorization, tested against real SQL (SPEC §15.6): every function
// takes the ACTING user row; the student path derives the thread from it
// and ignores any student id the client sends.

type Schema = typeof import("@/db/schema");
type User = Schema["users"]["$inferSelect"];
let m: typeof import("./messages");
let schema: Schema;
let db: Awaited<ReturnType<typeof migrateTestDb>>;

let admin: User, alice: User, bob: User, paused: User;

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeAll(async () => {
  db = await migrateTestDb();
  m = await import("./messages");
  schema = await import("@/db/schema");
  [admin, alice, bob, paused] = await db
    .insert(schema.users)
    .values([
      { role: "admin", name: "Dimitra", username: "dimitra", passwordHash: "locked", email: "d@x" },
      { role: "student", name: "Alice", username: "alice", passwordHash: "locked", email: "a@x" },
      { role: "student", name: "Bob", username: "bob", passwordHash: "locked", email: "b@x" },
      { role: "student", name: "Paused Pat", username: "pat", passwordHash: "locked", email: "p@x", active: false },
    ])
    .returning();
});

describe("student side — the thread is always the actor's own", () => {
  it("a student's message lands in their own thread only", async () => {
    expect(await m.postStudentMessage(alice, form({ body: "  hello Dimitra  " }))).toEqual({ ok: true });
    const mine = await m.studentThread(alice);
    expect(mine.map((x) => [x.sender, x.body])).toEqual([["student", "hello Dimitra"]]);
    expect(await m.studentThread(bob)).toEqual([]);
  });

  it("a forged studentId in the POST is ignored — the message still lands in the actor's thread", async () => {
    expect(await m.postStudentMessage(alice, form({ studentId: bob.id, body: "sneaky" }))).toEqual({ ok: true });
    expect((await m.studentThread(bob)).length).toBe(0);
    expect((await m.studentThread(alice)).map((x) => x.body)).toEqual(["hello Dimitra", "sneaky"]);
  });

  it("rejects an empty body server-side and inserts nothing", async () => {
    const before = (await m.studentThread(alice)).length;
    expect(await m.postStudentMessage(alice, form({ body: "   " }))).toEqual({ ok: false, reason: "empty" });
    expect(await m.postStudentMessage(alice, form({}))).toEqual({ ok: false, reason: "empty" });
    expect((await m.studentThread(alice)).length).toBe(before);
  });

  it("rejects a body over 4000 characters", async () => {
    expect(await m.postStudentMessage(alice, form({ body: "x".repeat(4001) }))).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("a globally paused student can neither read nor write (Rule 3, defense in depth)", async () => {
    await expect(m.postStudentMessage(paused, form({ body: "let me in" }))).rejects.toThrow(
      m.MessageAccessError,
    );
    await expect(m.studentThread(paused)).rejects.toThrow(/paused/);
  });

  it("an admin cannot use the student path", async () => {
    await expect(m.postStudentMessage(admin, form({ body: "hi" }))).rejects.toThrow(/not-student/);
    await expect(m.studentThread(admin)).rejects.toThrow(/not-student/);
  });
});

describe("tutor side — admin only", () => {
  it("a student can never read another student's thread or the inbox", async () => {
    await expect(m.adminThread(alice, bob.id)).rejects.toThrow(/not-admin/);
    await expect(m.adminThreads(alice)).rejects.toThrow(/not-admin/);
  });

  it("a student can never write into another student's thread", async () => {
    await expect(m.postTutorReply(alice, bob.id, form({ body: "as Dimitra" }))).rejects.toThrow(/not-admin/);
    expect(await m.studentThread(bob)).toEqual([]);
  });

  it("the tutor's reply lands in that student's thread as 'tutor' and is unread for the student", async () => {
    expect(await m.postTutorReply(admin, alice.id, form({ body: "Hi Alice — yes!" }))).toEqual({ ok: true });
    const thread = await m.studentThread(alice);
    expect(thread.at(-1)?.sender).toBe("tutor");
    expect(thread.at(-1)?.body).toBe("Hi Alice — yes!");
    expect(await m.unreadForStudent(alice.id)).toBe(1);
    expect(await m.unreadForStudent(bob.id)).toBe(0);
  });

  it("replying marks that thread read for the tutor; other threads keep their unread", async () => {
    await m.postStudentMessage(bob, form({ body: "question from Bob" }));
    await m.postStudentMessage(alice, form({ body: "another from Alice" }));
    // Alice's first two were already marked read by the reply in the previous
    // test, so: Alice "another" + Bob "question".
    expect(await m.unreadForTutor()).toBe(2);
    await m.postTutorReply(admin, alice.id, form({ body: "answered" }));
    expect(await m.unreadForTutor()).toBe(1); // only Bob's remains
    const summary = (await m.adminThreads(admin)).find((t) => t.student.id === alice.id);
    expect(summary?.unread).toBe(0);
  });

  it("opening the thread marks the tutor's messages read for the student", async () => {
    expect(await m.unreadForStudent(alice.id)).toBe(2);
    await m.markThreadReadForStudent(alice);
    expect(await m.unreadForStudent(alice.id)).toBe(0);
    const thread = await m.studentThread(alice);
    expect(thread.filter((x) => x.sender === "tutor").every((x) => x.readAt instanceof Date)).toBe(true);
  });

  it("the inbox lists threads by latest activity, unread counts, students without messages last", async () => {
    const threads = await m.adminThreads(admin);
    expect(threads.map((t) => t.student.name)).toEqual(["Alice", "Bob", "Paused Pat"]);
    expect(threads.map((t) => t.unread)).toEqual([0, 1, 0]);
    expect(threads[0].lastMessage?.body).toBe("answered");
    expect(threads[2].lastMessage).toBeNull();
  });

  it("reads a thread by student id for the admin; unknown or malformed ids → null", async () => {
    const t = await m.adminThread(admin, bob.id);
    expect(t?.student.name).toBe("Bob");
    expect(t?.messages.map((x) => x.body)).toEqual(["question from Bob"]);
    expect(await m.adminThread(admin, "00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await m.adminThread(admin, "not-a-uuid")).toBeNull();
    await expect(m.postTutorReply(admin, "not-a-uuid", form({ body: "x" }))).rejects.toThrow(/unknown-student/);
  });

  it("the tutor's empty reply is rejected server-side", async () => {
    const before = (await m.adminThread(admin, bob.id))!.messages.length;
    expect(await m.postTutorReply(admin, bob.id, form({ body: " " }))).toEqual({ ok: false, reason: "empty" });
    expect((await m.adminThread(admin, bob.id))!.messages.length).toBe(before);
  });
});
