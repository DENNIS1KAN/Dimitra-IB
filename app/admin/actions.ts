"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cohorts, enrollments, materials, modules, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { hashPassword, isAcceptablePassword } from "@/lib/password";
import { storage } from "@/lib/storage";
import { isUniqueViolation } from "@/lib/db-errors";
import { postTutorReply } from "@/lib/messages";
import { updateSettings } from "@/lib/settings";
import { releaseInstantFromDayText } from "@/lib/tz";
import { isUuid } from "@/lib/validate";
import type { ComposerState } from "@/components/messages/composer";
import type { SettingsFormState } from "@/components/admin/settings-form";

// Forms carry a hidden "back" field naming the admin page that hosted them
// (SPEC §15.7 #23: the same actions serve the home strip, the course hub
// tabs, and the students drawer). Anything that is not an /admin path falls
// back to the home.
function backTo(formData: FormData, fallback = "/admin"): string {
  const back = String(formData.get("back") ?? "");
  return back.startsWith("/admin") ? back : fallback;
}

function withParam(path: string, param: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${param}`;
}

/** The week editor's canonical path (nested under its course). */
async function weekPath(moduleId: string): Promise<string> {
  const [m] = await db.select().from(modules).where(eq(modules.id, moduleId));
  return m ? `/admin/courses/${m.cohortId}/weeks/${m.id}` : "/admin";
}

// ---------------------------------------------------------------------------
// Cohorts

export async function createCohort(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const level = String(formData.get("level") ?? "HL") as "HL" | "SL";
  const examYear = Number(formData.get("examYear") ?? new Date().getFullYear() + 2);
  if (!name || !subject) redirect("/admin/courses/new?error=cohort");
  const [created] = await db
    .insert(cohorts)
    .values({ name, subject, level, examYear })
    .returning({ id: cohorts.id });
  revalidatePath("/admin");
  redirect(`/admin/courses/${created.id}`);
}

/** The Details tab (SPEC §15.7 #23): blurb, listed, subject, level, exam year. */
export async function updateCohort(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const blurb = String(formData.get("blurb") ?? "").trim() || null;
  const isListed = formData.get("isListed") === "on";
  const subject = String(formData.get("subject") ?? "").trim();
  const level = String(formData.get("level") ?? "") as "HL" | "SL";
  const examYear = Number(formData.get("examYear") ?? 0);
  if (isUuid(id)) {
    await db
      .update(cohorts)
      .set({
        blurb,
        isListed,
        ...(subject ? { subject } : {}),
        ...(level === "HL" || level === "SL" ? { level } : {}),
        ...(Number.isInteger(examYear) && examYear > 2000 ? { examYear } : {}),
      })
      .where(eq(cohorts.id, id));
  }
  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}?tab=details&ok=saved`);
}

// ---------------------------------------------------------------------------
// Enrollments (SPEC §15.5): the requests + each student's standing per
// course. users.active stays the global switch; these are per course.

export async function approveRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  if (isUuid(id)) {
    await db
      .update(enrollments)
      .set({ status: "active", decidedAt: new Date() })
      .where(and(eq(enrollments.id, id), eq(enrollments.status, "requested")));
  }
  const back = backTo(formData);
  revalidatePath(back);
  redirect(back);
}

/** Decline = the request disappears; the student may ask again (SPEC §15.7 #7). */
export async function declineRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  if (isUuid(id)) {
    await db
      .delete(enrollments)
      .where(and(eq(enrollments.id, id), eq(enrollments.status, "requested")));
  }
  const back = backTo(formData);
  revalidatePath(back);
  redirect(back);
}

const ENROLLMENT_TRANSITIONS = ["active", "paused", "ended"] as const;
type EnrollmentTransition = (typeof ENROLLMENT_TRANSITIONS)[number];

export async function setEnrollmentStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (isUuid(id) && (ENROLLMENT_TRANSITIONS as readonly string[]).includes(status)) {
    await db
      .update(enrollments)
      .set({ status: status as EnrollmentTransition, decidedAt: new Date() })
      .where(eq(enrollments.id, id));
  }
  const back = backTo(formData);
  revalidatePath(back);
  redirect(back);
}

export async function addEnrollment(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "");
  if (isUuid(studentId) && isUuid(cohortId)) {
    const [existing] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.cohortId, cohortId)));
    if (existing) {
      await db
        .update(enrollments)
        .set({ status: "active", decidedAt: new Date() })
        .where(eq(enrollments.id, existing.id));
    } else {
      await db
        .insert(enrollments)
        .values({ studentId, cohortId, status: "active", decidedAt: new Date() });
    }
  }
  const back = backTo(formData);
  revalidatePath(back);
  redirect(back);
}

// ---------------------------------------------------------------------------
// Students & credentials: Dimitra creates each account and hands the
// username + password to the student herself (no email involved). Passwords
// are typed in the form so no secret ever rides in a redirect URL.

export async function createStudent(formData: FormData) {
  await requireAdmin();
  const back = backTo(formData, "/admin/students");
  const name = String(formData.get("name") ?? "").trim() || "New student";
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!username || !email || !cohortId) redirect(withParam(back, "error=student"));
  if (!isAcceptablePassword(password)) redirect(withParam(back, "error=password-short"));

  try {
    // The cohort picked at creation becomes the student's first ACTIVE
    // enrollment (SPEC §15.5); user + enrollment land together or not at all.
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ role: "student", name, username, passwordHash: hashPassword(password), email })
        .returning({ id: users.id });
      await tx
        .insert(enrollments)
        .values({ studentId: created.id, cohortId, status: "active", decidedAt: new Date() });
    });
  } catch (err) {
    // Unique indexes on username and email are the truth; a duplicate (or a
    // double-submit race) lands here instead of on the generic error page.
    if (isUniqueViolation(err)) redirect(withParam(back, "error=taken"));
    throw err;
  }
  revalidatePath("/admin/students");
  redirect("/admin/students?ok=created");
}

export async function resetStudentPassword(formData: FormData) {
  await requireAdmin();
  const back = backTo(formData, "/admin/students");
  const studentId = String(formData.get("studentId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!isAcceptablePassword(password)) redirect(withParam(back, "error=password-short"));
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  if (!student) redirect(withParam(back, "error=missing"));
  await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, student.id));
  redirect(withParam(back, "ok=password-set"));
}

/** Lever 1 (SPEC §5): the active flag mirrors PayPal reality. */
export async function toggleStudentActive(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  if (student) {
    await db.update(users).set({ active: !student.active }).where(eq(users.id, student.id));
  }
  const back = backTo(formData, "/admin/students");
  revalidatePath(back);
  redirect(back);
}

// ---------------------------------------------------------------------------
// Modules. Creation happens inside a course (the "Add week N" composer,
// SPEC §15.7 #23); the editor lives at /admin/courses/[id]/weeks/[moduleId].

export async function createModule(formData: FormData) {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!isUuid(cohortId)) redirect("/admin");
  const hub = `/admin/courses/${cohortId}`;
  const weekNumber = Number(formData.get("weekNumber") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  // dd/mm/yyyy on the TUTOR's calendar; the time is always 09:00 Athens
  // (SPEC §15.7 #15). Invalid text parses to a NaN Date and is rejected.
  const releaseDate = releaseInstantFromDayText(String(formData.get("releaseDay") ?? ""));
  if (!title || !weekNumber || Number.isNaN(releaseDate.getTime())) {
    redirect(`${hub}?error=module`);
  }
  let created: { id: string };
  try {
    [created] = await db
      .insert(modules)
      .values({ cohortId, weekNumber, title, releaseDate })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Week-taken is only detectable server-side; carry the typed values
      // back so the redirect doesn't wipe the composer.
      const carry = new URLSearchParams({
        error: "week-taken",
        weekNumber: String(weekNumber),
        title,
        releaseDay: String(formData.get("releaseDay") ?? ""),
      });
      redirect(`${hub}?${carry.toString()}`);
    }
    throw err;
  }
  revalidatePath(hub);
  redirect(`${hub}/weeks/${created.id}`);
}

export async function updateModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const editor = await weekPath(id);
  const weekNumber = Number(formData.get("weekNumber") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const releaseDate = releaseInstantFromDayText(String(formData.get("releaseDay") ?? ""));
  if (!id || !title || !weekNumber || Number.isNaN(releaseDate.getTime())) {
    redirect(`${editor}?error=save`);
  }
  try {
    await db
      .update(modules)
      .set({ weekNumber, title, releaseDate })
      .where(eq(modules.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      const carry = new URLSearchParams({
        error: "week-taken",
        weekNumber: String(weekNumber),
        title,
        releaseDay: String(formData.get("releaseDay") ?? ""),
      });
      redirect(`${editor}?${carry.toString()}`);
    }
    throw err;
  }
  revalidatePath(editor);
  redirect(`${editor}?ok=saved`);
}

/**
 * The weekly note autosave (SPEC §15.7 #23). The note is the module
 * description students see; saving returns quietly, no redirect.
 */
export async function saveModuleNote(
  moduleId: string,
  note: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!isUuid(moduleId)) return { ok: false };
  const description = note.trim().slice(0, 2000) || null;
  await db.update(modules).set({ description }).where(eq(modules.id, moduleId));
  revalidatePath(await weekPath(moduleId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Materials

/**
 * Drag-to-reorder within one slot (videos). `orderedIds` is the new order of
 * that type's rows; the other types keep their relative places. The whole
 * module is renumbered 0..n-1, deterministic and self-healing.
 */
export async function reorderMaterials(
  moduleId: string,
  type: string,
  orderedIds: string[],
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!isUuid(moduleId) || !orderedIds.every(isUuid)) return { ok: false };
  const siblings = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, moduleId))
    .orderBy(materials.sortOrder, materials.id);
  const ofType = siblings.filter((m) => m.type === type).map((m) => m.id);
  const isPermutation =
    ofType.length === orderedIds.length && ofType.every((id) => orderedIds.includes(id));
  if (!isPermutation) return { ok: false };
  let cursor = 0;
  const reordered = siblings.map((m) => (m.type === type ? orderedIds[cursor++] : m.id));
  await db.transaction(async (tx) => {
    for (let i = 0; i < reordered.length; i++) {
      await tx.update(materials).set({ sortOrder: i }).where(eq(materials.id, reordered[i]));
    }
  });
  revalidatePath(await weekPath(moduleId));
  return { ok: true };
}

export async function renameMaterial(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (mat && title) {
    await db.update(materials).set({ title }).where(eq(materials.id, id));
  }
  if (mat) {
    const editor = await weekPath(mat.moduleId);
    revalidatePath(editor);
    redirect(editor);
  }
}

export async function deleteMaterial(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (mat) {
    await db.delete(materials).where(eq(materials.id, id));
    await storage.delete(mat.storageKey);
    const editor = await weekPath(mat.moduleId);
    revalidatePath(editor);
    redirect(editor);
  }
}

/** Used by the slots' Remove links (client-invoked, no redirect). */
export async function removeMaterial(materialId: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!isUuid(materialId)) return { ok: false };
  const [mat] = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!mat) return { ok: false };
  await db.delete(materials).where(eq(materials.id, materialId));
  await storage.delete(mat.storageKey);
  revalidatePath(await weekPath(mat.moduleId));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Messages (SPEC §15.5): the tutor's reply; replying marks the thread read.

export async function replyToStudent(
  studentId: string,
  _prev: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  const user = await requireAdmin();
  const result = await postTutorReply(user, studentId, formData);
  if (!result.ok) return result;
  revalidatePath(`/admin/messages/${studentId}`);
  revalidatePath("/admin/messages");
  return { ok: true, at: Date.now() };
}

// ---------------------------------------------------------------------------
// Settings (SPEC §15.5): booking_url, clinic_text, clinic_day, clinic_time.

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireAdmin();
  const result = await updateSettings(user, formData);
  if (!result.ok) return result;
  revalidatePath("/admin/settings");
  revalidatePath("/app/sessions");
  return { ok: true, at: Date.now() };
}
