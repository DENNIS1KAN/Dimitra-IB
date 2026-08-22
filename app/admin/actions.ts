"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cohorts, materials, modules, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { createMagicLink, deliverMagicLink } from "@/lib/auth";
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
// Students & invites

export async function createStudentAndInvite(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim() || "New student";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!email || !cohortId) redirect("/admin?error=invite");

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) redirect("/admin?error=email-taken");

  const [student] = await db
    .insert(users)
    .values({ role: "student", name, email, cohortId })
    .returning();
  const link = await createMagicLink(student.id, "invite");
  await deliverMagicLink(email, link);
  revalidatePath("/admin");
  // Console mode only: surface the link in the UI as well as the console.
  // With email configured the raw single-use token must never ride in a GET
  // query string (access logs, browser history).
  redirect(
    process.env.RESEND_API_KEY
      ? "/admin?ok=invited"
      : `/admin?ok=invited&link=${encodeURIComponent(link)}`,
  );
}

export async function reinviteStudent(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const [student] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.role, "student")));
  if (!student) redirect("/admin?error=missing");
  const link = await createMagicLink(student.id, "invite");
  await deliverMagicLink(student.email, link);
  redirect(
    process.env.RESEND_API_KEY
      ? "/admin?ok=invited"
      : `/admin?ok=invited&link=${encodeURIComponent(link)}`,
  );
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
      redirect("/admin/modules?error=week-taken");
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
      redirect(`/admin/modules/${id}?error=week-taken`);
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
