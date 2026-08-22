// The access rules from SPEC §5, as amended by §15.2 — the entire business
// logic. Pure functions so they are trivially unit-testable; queries call
// these (and additionally filter by the student's ACTIVE cohorts in SQL so
// other cohorts' modules never even leave the database layer).

export type EnrollmentStatus = "requested" | "active" | "paused" | "ended";

export type GatingEnrollment = { cohortId: string; status: EnrollmentStatus };

export type GatingStudent = {
  /** users.active — the global master switch (Lever 1, Rule 3). */
  active: boolean;
  enrollments: readonly GatingEnrollment[];
};

export type GatingModule = {
  cohortId: string;
  releaseDate: Date;
};

export type ModuleState = "open" | "locked-teaser" | "invisible";

/**
 * Rule 3 — Paused behavior (deliberately blunt).
 * An inactive student sees only the full-screen paused state.
 */
export function isPaused(student: { active: boolean }): boolean {
  return !student.active;
}

/** The student's standing in a cohort — "none" when there is no enrollment row. */
export function courseAccess(
  student: GatingStudent,
  cohortId: string,
): EnrollmentStatus | "none" {
  return student.enrollments.find((e) => e.cohortId === cohortId)?.status ?? "none";
}

/**
 * Rule 1 — Module visibility (enrollment-based).
 * open           iff ACTIVE enrollment in the module's cohort AND released
 *                AND users.active
 * locked-teaser  for future modules in actively enrolled cohorts
 * invisible      for everything else — no / requested / paused / ended
 *                enrollment, or a globally paused student (never rendered,
 *                404 by direct URL)
 *
 * Note: a paused student never reaches a module list (Rule 3 short-circuits
 * at the layout level), but the rule is still total: paused ⇒ nothing is open.
 */
export function moduleState(
  module: GatingModule,
  student: GatingStudent,
  now: Date,
): ModuleState {
  if (isPaused(student)) return "invisible";
  if (courseAccess(student, module.cohortId) !== "active") return "invisible";
  if (module.releaseDate.getTime() <= now.getTime()) return "open";
  return "locked-teaser";
}

/**
 * Rule 2 — Solutions gating.
 * Solutions for a module are visible iff the student has a submission for it;
 * the same fact marks the module complete.
 */
export function solutionsVisible(hasSubmission: boolean): boolean {
  return hasSubmission;
}

export function isModuleComplete(hasSubmission: boolean): boolean {
  return hasSubmission;
}

/**
 * Soft deadline (SPEC §15.1): overdue iff a due date exists, has passed, and
 * nothing was submitted. A badge only — submission is never blocked by it.
 */
export function isOverdue(dueDate: Date | null, hasSubmission: boolean, now: Date): boolean {
  return dueDate !== null && now.getTime() > dueDate.getTime() && !hasSubmission;
}
