// The three access rules from SPEC §5 — the entire business logic of V1.
// Pure functions so they are trivially unit-testable; queries call these
// (and additionally filter by cohort server-side so other cohorts' modules
// never even leave the database layer).

export type GatingStudent = {
  cohortId: string | null;
  active: boolean;
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
export function isPaused(student: GatingStudent): boolean {
  return !student.active;
}

/**
 * Rule 1 — Module visibility.
 * open       iff same cohort AND released AND student active
 * locked-teaser  for future modules in the student's cohort
 * invisible  for other cohorts' modules (never rendered, even by direct URL)
 *
 * Note: a paused student never reaches a module list (Rule 3 short-circuits
 * at the layout level), but the rule is still total: paused ⇒ nothing is open.
 */
export function moduleState(
  module: GatingModule,
  student: GatingStudent,
  now: Date,
): ModuleState {
  if (module.cohortId !== student.cohortId) return "invisible";
  if (isPaused(student)) return "invisible";
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
