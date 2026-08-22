"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cohorts, enrollments } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { requireStudent } from "@/lib/student";
import { isUuid } from "@/lib/validate";

/**
 * "Ask to join" (SPEC §15.1): creates a request that Dimitra approves in
 * /admin/requests. Only LISTED cohorts can be asked for — even by a crafted
 * POST — and an existing active/paused/requested row is left untouched.
 */
export async function requestToJoin(formData: FormData) {
  const user = await requireStudent();
  const cohortId = String(formData.get("cohortId") ?? "");
  if (!isUuid(cohortId)) redirect("/app/courses");
  const [cohort] = await db
    .select()
    .from(cohorts)
    .where(and(eq(cohorts.id, cohortId), eq(cohorts.isListed, true)));
  if (!cohort) redirect("/app/courses");

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentId, user.id), eq(enrollments.cohortId, cohort.id)));
  if (!existing) {
    try {
      await db
        .insert(enrollments)
        .values({ studentId: user.id, cohortId: cohort.id, status: "requested" });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // double-submit race: the first request stands
    }
  } else if (existing.status === "ended") {
    // A student who left a course may ask to come back.
    await db
      .update(enrollments)
      .set({ status: "requested", requestedAt: new Date(), decidedAt: null })
      .where(eq(enrollments.id, existing.id));
  }
  revalidatePath("/app/courses");
  redirect("/app/courses?ok=requested");
}
