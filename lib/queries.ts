import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts,
  materials,
  modules,
  submissions,
  type Cohort,
  type Enrollment,
  type Material,
  type Module,
  type User,
} from "@/db/schema";
import { loadStudentAccess, type StudentAccess } from "./access";
import { compareByRecency, pickCurrent } from "./current";
import { isModuleComplete, moduleState, type ModuleState } from "./gating";
import { isUuid } from "./validate";

export type ModuleListEntry = {
  module: Module;
  cohort: Cohort;
  state: ModuleState;
  complete: boolean;
  materialCounts: Record<string, number>;
};

export type StudentModuleList = {
  access: StudentAccess;
  /** Cohorts with an ACTIVE enrollment — the only ones Rule 1 can open. */
  activeCohorts: Cohort[];
  pausedCohorts: Cohort[];
  current: ModuleListEntry | null;
  olderReleased: ModuleListEntry[];
  future: ModuleListEntry[];
  completedCount: number;
  releasedCount: number;
};

async function cohortsById(ids: string[]) {
  const rows = ids.length ? await db.select().from(cohorts).where(inArray(cohorts.id, ids)) : [];
  return new Map(rows.map((c) => [c.id, c]));
}

async function submissionMap(studentId: string, moduleIds: string[]) {
  const subs = moduleIds.length
    ? await db
        .select()
        .from(submissions)
        .where(and(eq(submissions.studentId, studentId), inArray(submissions.moduleId, moduleIds)))
    : [];
  return new Map(subs.map((s) => [s.moduleId, s]));
}

/**
 * Everything /app needs. Cohort filtering happens in SQL on the student's
 * ACTIVE enrollments (other cohorts' modules never leave the DB layer —
 * Rule 1's "invisible"); open/teaser classification still goes through
 * lib/gating so the tested rules are the only decision point.
 */
export async function studentModuleList(student: User): Promise<StudentModuleList> {
  const now = new Date();
  const access = await loadStudentAccess(student);
  const byId = await cohortsById(access.enrollments.map((e) => e.cohortId));
  const pick = (status: Enrollment["status"]) =>
    access.enrollments
      .filter((e) => e.status === status)
      .map((e) => byId.get(e.cohortId))
      .filter((c): c is Cohort => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));
  const activeCohorts = pick("active");
  const pausedCohorts = pick("paused");
  const empty: StudentModuleList = {
    access,
    activeCohorts,
    pausedCohorts,
    current: null,
    olderReleased: [],
    future: [],
    completedCount: 0,
    releasedCount: 0,
  };
  if (activeCohorts.length === 0 || !student.active) return empty;

  const rows = await db
    .select()
    .from(modules)
    .where(
      inArray(
        modules.cohortId,
        activeCohorts.map((c) => c.id),
      ),
    )
    .orderBy(asc(modules.weekNumber));
  const subs = await submissionMap(
    student.id,
    rows.map((m) => m.id),
  );
  const mats = rows.length
    ? await db
        .select({ moduleId: materials.moduleId, type: materials.type })
        .from(materials)
        .where(
          inArray(
            materials.moduleId,
            rows.map((m) => m.id),
          ),
        )
    : [];
  const countsByModule = new Map<string, Record<string, number>>();
  for (const m of mats) {
    const c = countsByModule.get(m.moduleId) ?? {};
    c[m.type] = (c[m.type] ?? 0) + 1;
    countsByModule.set(m.moduleId, c);
  }

  const entries: ModuleListEntry[] = rows.map((module) => {
    const has = subs.has(module.id);
    return {
      module,
      cohort: byId.get(module.cohortId)!,
      state: moduleState(module, access, now),
      complete: isModuleComplete(has),
      materialCounts: countsByModule.get(module.id) ?? {},
    };
  });

  const released = entries.filter((e) => e.state === "open");
  const future = entries
    .filter((e) => e.state === "locked-teaser")
    .sort((a, b) => a.module.releaseDate.getTime() - b.module.releaseDate.getTime());
  // Hero = "this week" per the shared lib/current rule (most recent release,
  // then course title, then week — SPEC §15.7 #16).
  const releasable = (e: ModuleListEntry) => ({ ...e.module, courseTitle: e.cohort.name });
  const currentModule = pickCurrent(released.map(releasable));
  const current = released.find((e) => e.module.id === currentModule?.id) ?? null;
  const olderReleased = released
    .filter((e) => e.module.id !== currentModule?.id)
    .sort((a, b) => compareByRecency(releasable(a), releasable(b))); // newest first below the hero

  return {
    ...empty,
    current,
    olderReleased,
    future,
    completedCount: released.filter((e) => e.complete).length,
    releasedCount: released.length,
  };
}

export type StudentModuleDetail = {
  module: Module;
  cohort: Cohort;
  materials: Material[];
  hasSubmission: boolean;
  isCurrent: boolean;
};

/**
 * Module page data. Returns null when the module must not exist for this
 * student — no active enrollment, unreleased, or paused (Rule 1: invisible
 * even by direct URL → the page 404s).
 */
export async function studentModuleDetail(
  moduleId: string,
  student: User,
): Promise<StudentModuleDetail | null> {
  if (!isUuid(moduleId)) return null; // malformed id → 404, not a 22P02 500
  const now = new Date();
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return null;
  const access = await loadStudentAccess(student);
  if (moduleState(module, access, now) !== "open") return null;

  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, module.cohortId));
  const mats = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, module.id))
    .orderBy(asc(materials.sortOrder), asc(materials.id));
  const [sub] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.studentId, student.id), eq(submissions.moduleId, module.id)));

  const siblings = await db
    .select()
    .from(modules)
    .where(eq(modules.cohortId, module.cohortId));
  const releasedSiblings = siblings
    .filter((m) => m.releaseDate.getTime() <= now.getTime())
    .map((m) => ({ ...m, courseTitle: cohort.name }));
  // Same rule as the /app hero — the list and this badge can never disagree.
  const isCurrent = pickCurrent(releasedSiblings)?.id === module.id;

  return {
    module,
    cohort,
    materials: mats,
    hasSubmission: !!sub,
    isCurrent,
  };
}

// --- /app/courses -----------------------------------------------------------

export type MyCourse = {
  cohort: Cohort;
  enrollment: Enrollment;
  releasedCount: number;
  completedCount: number;
};
export type CatalogCourse = { cohort: Cohort; requested: boolean };
export type StudentCourses = { mine: MyCourse[]; catalog: CatalogCourse[] };

/** My courses (active / paused) + the catalog of listed cohorts I'm not in. */
export async function studentCourses(student: User): Promise<StudentCourses> {
  const now = new Date();
  const access = await loadStudentAccess(student);
  const byCohort = new Map(access.enrollments.map((e) => [e.cohortId, e]));
  const listed = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.isListed, true))
    .orderBy(asc(cohorts.name));
  const mineIds = access.enrollments
    .filter((e) => e.status === "active" || e.status === "paused")
    .map((e) => e.cohortId);
  const byId = await cohortsById(mineIds);

  const mods = mineIds.length
    ? await db.select().from(modules).where(inArray(modules.cohortId, mineIds))
    : [];
  const subs = await submissionMap(
    student.id,
    mods.map((m) => m.id),
  );

  const mine: MyCourse[] = [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cohort) => {
      const released = mods.filter(
        (m) => m.cohortId === cohort.id && m.releaseDate.getTime() <= now.getTime(),
      );
      return {
        cohort,
        enrollment: byCohort.get(cohort.id)!,
        releasedCount: released.length,
        completedCount: released.filter((m) => subs.has(m.id)).length,
      };
    });

  const catalog: CatalogCourse[] = listed
    .filter((c) => !mineIds.includes(c.id))
    .map((cohort) => ({ cohort, requested: byCohort.get(cohort.id)?.status === "requested" }));

  return { mine, catalog };
}

// --- /app/assignments -------------------------------------------------------

export type Assignment = {
  module: Module;
  cohort: Cohort;
  submittedAt: Date | null;
};
export type StudentAssignments = { open: Assignment[]; completed: Assignment[] };

/**
 * Released modules across active enrollments the student has not submitted
 * yet (newest release first, the shared lib/current order — SPEC §15.7 #16),
 * then what they've done (latest submission first).
 */
export async function studentAssignments(student: User): Promise<StudentAssignments> {
  const list = await studentModuleList(student);
  const released = [list.current, ...list.olderReleased].filter(
    (e): e is ModuleListEntry => !!e,
  );
  const subs = await submissionMap(
    student.id,
    released.map((e) => e.module.id),
  );
  const all: Assignment[] = released.map((e) => ({
    module: e.module,
    cohort: e.cohort,
    submittedAt: subs.get(e.module.id)?.createdAt ?? null,
  }));
  const recency = (a: Assignment, b: Assignment) =>
    compareByRecency(
      { ...a.module, courseTitle: a.cohort.name },
      { ...b.module, courseTitle: b.cohort.name },
    );
  return {
    open: all.filter((a) => !a.submittedAt).sort(recency),
    completed: all
      .filter((a) => a.submittedAt)
      .sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime()),
  };
}

/** "3 videos · slides · exercises" — counts derived from material rows. */
export function materialMeta(counts: Record<string, number>): string {
  const parts: string[] = [];
  if (counts.video) parts.push(`${counts.video} video${counts.video === 1 ? "" : "s"}`);
  if (counts.slides) parts.push("slides");
  if (counts.exercises) parts.push("exercises");
  return parts.join(" · ");
}
