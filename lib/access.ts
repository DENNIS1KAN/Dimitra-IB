import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, type Enrollment, type User } from "@/db/schema";
import type { GatingStudent } from "./gating";

/**
 * Everything Rule 1 needs about a student, loaded once per request. The full
 * enrollment rows satisfy GatingStudent structurally (cohortId + status).
 */
export type StudentAccess = { active: boolean; enrollments: Enrollment[] };
const _assignable: GatingStudent = null as unknown as StudentAccess; // compile-time check
void _assignable;

export async function loadStudentAccess(user: User): Promise<StudentAccess> {
  const rows =
    user.role === "student"
      ? await db.select().from(enrollments).where(eq(enrollments.studentId, user.id))
      : [];
  return { active: user.active, enrollments: rows };
}

/** Cohort ids the student can currently see modules in (Rule 1's first clause). */
export const activeCohortIds = (access: StudentAccess) =>
  access.enrollments.filter((e) => e.status === "active").map((e) => e.cohortId);
