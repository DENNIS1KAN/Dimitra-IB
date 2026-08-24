import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, modules, submissions } from "@/db/schema";
import { storage, type FileStorage } from "./storage";
import { isUuid } from "./validate";

// Deleting a week (SPEC §15.7 #27), in one place so the rule has one home.
//
// THE HARD RULE: a module with any submission can never be deleted. Student
// work is the one thing in this app that cannot be recreated, and a week's
// row is what a submission points at. The admin menu says so instead of
// offering the action; this function refuses again, so a stale page or a
// hand-made POST reaches the same wall.

export type WeekDeletion =
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "has-submissions"; submitted: number }
  | { ok: true; cohortId: string; filesRemoved: number };

/**
 * Remove a week and everything that belongs only to it. The stored files go
 * first, because nothing else knows their keys once the rows are gone; the
 * module row's cascade then takes its materials, and theirs takes the
 * events. `files` is injectable so the rule can be tested without touching
 * the disk.
 */
export async function deleteWeek(
  moduleId: string,
  files: Pick<FileStorage, "delete"> = storage,
): Promise<WeekDeletion> {
  if (!isUuid(moduleId)) return { ok: false, reason: "not-found" };
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return { ok: false, reason: "not-found" };

  const attempts = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.moduleId, moduleId));
  if (attempts.length > 0) {
    return { ok: false, reason: "has-submissions", submitted: attempts.length };
  }

  const rows = await db.select().from(materials).where(eq(materials.moduleId, moduleId));
  // A link video (SPEC §15.7 #25) holds no bytes here, so it has no key.
  const keys = rows.map((m) => m.storageKey).filter((k): k is string => !!k);
  for (const key of keys) await files.delete(key);
  await db.delete(modules).where(eq(modules.id, moduleId));

  return { ok: true, cohortId: module.cohortId, filesRemoved: keys.length };
}
