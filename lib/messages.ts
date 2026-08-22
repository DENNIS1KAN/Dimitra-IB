import "server-only";
import { and, asc, count, eq, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { messages, users, type Message, type User } from "@/db/schema";
import { validateMessageBody } from "./messages-rules";
import { isUuid } from "./validate";

// One thread per student (SPEC §15.3). Every function takes the ACTING user
// row: the student path derives the thread from the actor and ignores any
// student id the client sends; the tutor path requires role === "admin".
// This module is the only place that reads or writes `messages`.

export type AccessReason = "not-student" | "not-admin" | "paused" | "unknown-student";

export class MessageAccessError extends Error {
  constructor(public readonly reason: AccessReason) {
    super(`message access denied: ${reason}`);
    this.name = "MessageAccessError";
  }
}

export type PostResult = { ok: true } | { ok: false; reason: "empty" | "too-long" };

export type ThreadSummary = { student: User; lastMessage: Message | null; unread: number };

function requireStudentActor(actor: User) {
  if (actor.role !== "student") throw new MessageAccessError("not-student");
  // Rule 3, defense in depth: the /app layout already hides everything for a
  // paused student, but a direct POST must be refused too.
  if (!actor.active) throw new MessageAccessError("paused");
}

function requireAdminActor(actor: User) {
  if (actor.role !== "admin") throw new MessageAccessError("not-admin");
}

const threadOrder = [asc(messages.createdAt), asc(messages.id)];

// ---------------------------------------------------------------------------
// Student side — always the actor's own thread.

export async function studentThread(actor: User): Promise<Message[]> {
  requireStudentActor(actor);
  return db
    .select()
    .from(messages)
    .where(eq(messages.studentId, actor.id))
    .orderBy(...threadOrder);
}

/** Opening the thread marks the tutor's messages read (SPEC §15.4). */
export async function markThreadReadForStudent(actor: User): Promise<void> {
  requireStudentActor(actor);
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(eq(messages.studentId, actor.id), eq(messages.sender, "tutor"), isNull(messages.readAt)),
    );
}

/** The student's composer. Any `studentId` field in the form is ignored. */
export async function postStudentMessage(actor: User, formData: FormData): Promise<PostResult> {
  requireStudentActor(actor);
  const check = validateMessageBody(formData.get("body"));
  if (!check.ok) return check;
  await db.insert(messages).values({ studentId: actor.id, sender: "student", body: check.body });
  return { ok: true };
}

/** Unread tutor messages — the dot on the student's Messages nav item. */
export async function unreadForStudent(studentId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(messages)
    .where(
      and(eq(messages.studentId, studentId), eq(messages.sender, "tutor"), isNull(messages.readAt)),
    );
  return n;
}

// ---------------------------------------------------------------------------
// Tutor side — admin only.

/** Unread student messages across all threads — the admin nav total. */
export async function unreadForTutor(): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(messages)
    .where(and(eq(messages.sender, "student"), isNull(messages.readAt)));
  return n;
}

/**
 * Every student as a thread, latest activity first; students who have never
 * messaged come last (by name) so Dimitra can still open and start a thread.
 */
export async function adminThreads(actor: User): Promise<ThreadSummary[]> {
  requireAdminActor(actor);
  const students = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));

  const latest = db
    .select({ studentId: messages.studentId, at: max(messages.createdAt).as("at") })
    .from(messages)
    .groupBy(messages.studentId)
    .as("latest");
  const lastRows = await db
    .select({ msg: messages })
    .from(messages)
    .innerJoin(
      latest,
      and(eq(messages.studentId, latest.studentId), eq(messages.createdAt, latest.at)),
    )
    .orderBy(asc(messages.id));
  const lastByStudent = new Map<string, Message>();
  for (const { msg } of lastRows) lastByStudent.set(msg.studentId, msg); // last id wins on a timestamp tie

  const unreadRows = await db
    .select({ studentId: messages.studentId, n: count() })
    .from(messages)
    .where(and(eq(messages.sender, "student"), isNull(messages.readAt)))
    .groupBy(messages.studentId);
  const unreadByStudent = new Map(unreadRows.map((r) => [r.studentId, r.n]));

  return students
    .map((student) => ({
      student,
      lastMessage: lastByStudent.get(student.id) ?? null,
      unread: unreadByStudent.get(student.id) ?? 0,
    }))
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt.getTime() ?? Number.NEGATIVE_INFINITY;
      const bt = b.lastMessage?.createdAt.getTime() ?? Number.NEGATIVE_INFINITY;
      return bt - at || a.student.name.localeCompare(b.student.name);
    });
}

async function findStudent(studentId: string): Promise<User | null> {
  if (!isUuid(studentId)) return null;
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  return student ?? null;
}

/** One student's thread for the inbox; null for unknown or malformed ids. */
export async function adminThread(
  actor: User,
  studentId: string,
): Promise<{ student: User; messages: Message[] } | null> {
  requireAdminActor(actor);
  const student = await findStudent(studentId);
  if (!student) return null;
  const list = await db
    .select()
    .from(messages)
    .where(eq(messages.studentId, student.id))
    .orderBy(...threadOrder);
  return { student, messages: list };
}

/** The tutor's reply — and replying marks that thread read for her (SPEC §15.5). */
export async function postTutorReply(
  actor: User,
  studentId: string,
  formData: FormData,
): Promise<PostResult> {
  requireAdminActor(actor);
  const student = await findStudent(studentId);
  if (!student) throw new MessageAccessError("unknown-student");
  const check = validateMessageBody(formData.get("body"));
  if (!check.ok) return check;
  await db.transaction(async (tx) => {
    await tx.insert(messages).values({ studentId: student.id, sender: "tutor", body: check.body });
    await tx
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.studentId, student.id),
          eq(messages.sender, "student"),
          isNull(messages.readAt),
        ),
      );
  });
  return { ok: true };
}
