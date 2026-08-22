"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cohorts, materials, modules, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/password";
import { storage } from "@/lib/storage";
import { isUniqueViolation } from "@/lib/db-errors";
import { parseLocalInTz } from "@/lib/tz";

// ---------------------------------------------------------------------------
// Cohorts

export async function createCohort(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const level = String(formData.get("level") ?? "HL") as "HL" | "SL";
  const examYear = Number(formData.get("examYear") ?? new Date().getFullYear() + 2);
  if (!name || !subject) redirect("/admin?error=cohort");
  await db.insert(cohorts).values({ name, subject, level, examYear });
  revalidatePath("/admin");
  redirect("/admin?ok=cohort");
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
  if (password.length < 8) redirect("/admin?error=password-short");

  try {
    await db.insert(users).values({
      role: "student",
      name,
      username,
      passwordHash: hashPassword(password),
      email,
      cohortId,
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
  if (password.length < 8) redirect("/admin?error=password-short");
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
