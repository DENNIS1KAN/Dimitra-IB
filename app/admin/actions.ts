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
import { parseLocalInTz } from "@/lib/tz";
import { isUuid } from "@/lib/validate";
import type { ComposerState } from "@/components/messages/composer";
import type { SettingsFormState } from "@/components/admin/settings-form";

// ---------------------------------------------------------------------------
// Cohorts

export async function createCohort(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const level = String(formData.get("level") ?? "HL") as "HL" | "SL";
  const examYear = Number(formData.get("examYear") ?? new Date().getFullYear() + 2);
  if (!name || !subject) redirect("/admin/courses?error=cohort");
  await db.insert(cohorts).values({ name, subject, level, examYear });
  revalidatePath("/admin/courses");
  redirect("/admin/courses?ok=cohort");
}

/** Catalog fields (SPEC §15.5): the blurb students read and whether it's listed. */
export async function updateCohort(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const blurb = String(formData.get("blurb") ?? "").trim() || null;
  const isListed = formData.get("isListed") === "on";
  if (isUuid(id)) await db.update(cohorts).set({ blurb, isListed }).where(eq(cohorts.id, id));
  revalidatePath("/admin/courses");
  redirect("/admin/courses?ok=saved");
}

// ---------------------------------------------------------------------------
// Enrollments (SPEC §15.5) — the requests queue + each student's standing
// per course. users.active stays the global switch; these are per course.

export async function approveRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("enrollmentId") ?? "");
  if (isUuid(id)) {
    await db
      .update(enrollments)
      .set({ status: "active", decidedAt: new Date() })
      .where(and(eq(enrollments.id, id), eq(enrollments.status, "requested")));
  }
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
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
  revalidatePath("/admin/requests");
  redirect("/admin/requests");
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
  revalidatePath("/admin");
  redirect("/admin");
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
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// Students & credentials — Dimitra creates each account and hands the
// username + password to the student herself (no email involved). Passwords
// are typed in the form so no secret ever rides in a redirect URL.

export async function createStudent(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim() || "New student";
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!username || !email || !cohortId) redirect("/admin?error=student");
  if (!isAcceptablePassword(password)) redirect("/admin?error=password-short");

  try {
    // The cohort picked at creation becomes the student's first ACTIVE
    // enrollment (SPEC §15.5) — user + enrollment land together or not at all.
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
    if (isUniqueViolation(err)) redirect("/admin?error=taken");
    throw err;
  }
  revalidatePath("/admin");
  redirect("/admin?ok=created");
}

export async function resetStudentPassword(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!isAcceptablePassword(password)) redirect("/admin?error=password-short");
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  if (!student) redirect("/admin?error=missing");
  await db.update(users).set({ passwordHash: hashPassword(password) }).where(eq(users.id, student.id));
  redirect("/admin?ok=password-set");
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
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// Modules

export async function createModule(formData: FormData) {
  await requireAdmin();
  const cohortId = String(formData.get("cohortId") ?? "");
  const weekNumber = Number(formData.get("weekNumber") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  // datetime-local means the TUTOR's wall clock, not the server's (UTC).
  const releaseDate = parseLocalInTz(String(formData.get("releaseDate") ?? ""));
  if (!cohortId || !title || !weekNumber || Number.isNaN(releaseDate.getTime())) {
    redirect("/admin/modules?error=module");
  }
  let created: { id: string };
  try {
    [created] = await db
      .insert(modules)
      .values({ cohortId, weekNumber, title, description, releaseDate })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Week-taken is only detectable server-side — carry the typed values
      // back so the redirect doesn't wipe the form.
      const carry = new URLSearchParams({
        error: "week-taken",
        cohortId,
        weekNumber: String(weekNumber),
        title,
        description: (description ?? "").slice(0, 1500),
        releaseDate: String(formData.get("releaseDate") ?? ""),
      });
      redirect(`/admin/modules?${carry.toString()}`);
    }
    throw err;
  }
  revalidatePath("/admin/modules");
  redirect(`/admin/modules/${created.id}`);
}

export async function updateModule(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const weekNumber = Number(formData.get("weekNumber") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const releaseDate = parseLocalInTz(String(formData.get("releaseDate") ?? ""));
  if (!id || !title || !weekNumber || Number.isNaN(releaseDate.getTime())) {
    redirect(`/admin/modules/${id}?error=save`);
  }
  try {
    await db
      .update(modules)
      .set({ weekNumber, title, description, releaseDate })
      .where(eq(modules.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      const carry = new URLSearchParams({
        error: "week-taken",
        weekNumber: String(weekNumber),
        title,
        description: (description ?? "").slice(0, 1500),
        releaseDate: String(formData.get("releaseDate") ?? ""),
      });
      redirect(`/admin/modules/${id}?${carry.toString()}`);
    }
    throw err;
  }
  revalidatePath(`/admin/modules/${id}`);
  redirect(`/admin/modules/${id}?ok=saved`);
}

// ---------------------------------------------------------------------------
// Materials

export async function moveMaterial(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "up");
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (!mat) return;
  // Renumber 0..n-1 instead of swapping values: deterministic order (id
  // tie-break) and self-healing if duplicate sort_orders ever appear.
  const siblings = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, mat.moduleId))
    .orderBy(materials.sortOrder, materials.id);
  const idx = siblings.findIndex((m) => m.id === id);
  const target = direction === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= siblings.length) return;
  const reordered = [...siblings];
  [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
  await db.transaction(async (tx) => {
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sortOrder !== i) {
        await tx.update(materials).set({ sortOrder: i }).where(eq(materials.id, reordered[i].id));
      }
    }
  });
  revalidatePath(`/admin/modules/${mat.moduleId}`);
  redirect(`/admin/modules/${mat.moduleId}`);
}

export async function renameMaterial(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (mat && title) {
    await db.update(materials).set({ title }).where(eq(materials.id, id));
    revalidatePath(`/admin/modules/${mat.moduleId}`);
  }
  if (mat) redirect(`/admin/modules/${mat.moduleId}`);
}

export async function deleteMaterial(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const [mat] = await db.select().from(materials).where(eq(materials.id, id));
  if (mat) {
    await db.delete(materials).where(eq(materials.id, id));
    await storage.delete(mat.storageKey);
    revalidatePath(`/admin/modules/${mat.moduleId}`);
    redirect(`/admin/modules/${mat.moduleId}`);
  }
}

// ---------------------------------------------------------------------------
// Messages (SPEC §15.5) — the tutor's reply; replying marks the thread read.

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
// Settings (SPEC §15.5) — booking_url, clinic_text.

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
