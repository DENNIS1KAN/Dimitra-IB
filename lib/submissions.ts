import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts,
  modules,
  submissions,
  users,
  type Cohort,
  type Module,
  type Submission,
  type User,
} from "@/db/schema";
import { isUuid } from "./validate";

// Admin-only read path for submissions (SPEC §15.5). Students have NO read
// path: submissions stay write-only for them (SPEC §7 / PROJECT_REPORT §7).

export class SubmissionAccessError extends Error {
  constructor() {
    super("submission access denied: not-admin");
    this.name = "SubmissionAccessError";
  }
}

export type AdminSubmission = {
  submission: Submission;
  student: User;
  module: Module;
  cohort: Cohort;
};

export async function adminSubmission(actor: User, id: string): Promise<AdminSubmission | null> {
  if (actor.role !== "admin") throw new SubmissionAccessError();
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ submission: submissions, student: users, module: modules, cohort: cohorts })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.studentId))
    .innerJoin(modules, eq(modules.id, submissions.moduleId))
    .innerJoin(cohorts, eq(cohorts.id, modules.cohortId))
    .where(eq(submissions.id, id));
  return row ?? null;
}
