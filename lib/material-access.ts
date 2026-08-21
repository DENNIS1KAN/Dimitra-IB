import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, submissions } from "@/db/schema";

export async function hasSubmissionFor(studentId: string, moduleId: string) {
  const [sub] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.studentId, studentId), eq(submissions.moduleId, moduleId)));
  return !!sub;
}

/** Event capture (SPEC §6): write-only in V1 — nothing reads it yet. */
export async function logMaterialEvent(
  studentId: string,
  materialId: string,
  type: "video_progress" | "download" | "view",
  value?: number,
) {
  try {
    await db.insert(events).values({ studentId, materialId, type, value });
  } catch {
    // Event capture must never break the student flow.
  }
}
