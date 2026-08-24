import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts,
  events,
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
import { isNewRelease } from "./format";
import { isModuleComplete, moduleState, type ModuleState } from "./gating";
import { planWeek, resumeCard, type ResumeCard, type WeekPlan } from "./steps";
import { isUuid } from "./validate";

/**
 * What the events table knows about one student and a set of materials
 * (SPEC §15.7 #27). `progress` is the highest saved video position, which is
 * where a Resume lands; `viewed` and `downloaded` are the existence of the
 * other two event types. Aggregated in SQL so a term of watching does not
 * come back row by row.
 */
export type MaterialSignals = { progress: number; viewed: boolean; downloaded: boolean };

export async function materialSignals(
  studentId: string,
  materialIds: string[],
): Promise<Map<string, MaterialSignals>> {
  const map = new Map<string, MaterialSignals>();
  if (materialIds.length === 0) return map;
  const rows = await db
    .select({
      materialId: events.materialId,
      type: events.type,
      top: sql<number>`coalesce(max(${events.value}), 0)::int`,
    })
    .from(events)
    .where(and(eq(events.studentId, studentId), inArray(events.materialId, materialIds)))
    .groupBy(events.materialId, events.type);
  for (const r of rows) {
    const cur = map.get(r.materialId) ?? { progress: 0, viewed: false, downloaded: false };
    if (r.type === "video_progress") cur.progress = Math.max(cur.progress, r.top);
    if (r.type === "view") cur.viewed = true;
    if (r.type === "download") cur.downloaded = true;
    map.set(r.materialId, cur);
  }
  return map;
}

const NO_SIGNALS: MaterialSignals = { progress: 0, viewed: false, downloaded: false };

/** Materials + this student's events for one week, as lib/steps wants them. */
export function weekInputFrom(
  module: Module,
  mats: Material[],
  signals: Map<string, MaterialSignals>,
  hasSubmission: boolean,
) {
  const exercises = mats.find((m) => m.type === "exercises") ?? null;
  return {
    moduleId: module.id,
    weekNumber: module.weekNumber,
    videos: mats
      .filter((m) => m.type === "video")
      .map((m) => {
        const s = signals.get(m.id) ?? NO_SIGNALS;
        return {
          id: m.id,
          title: m.title,
          isLink: !!m.externalUrl,
          durationSeconds: m.durationSeconds,
          progressSeconds: s.progress,
          viewed: s.viewed,
        };
      }),
    exercisesId: exercises?.id ?? null,
    exercisesDownloaded: exercises ? (signals.get(exercises.id) ?? NO_SIGNALS).downloaded : false,
    solutionsId: mats.find((m) => m.type === "solutions")?.id ?? null,
    hasSubmission,
  };
}

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
  /** The week as a numbered path (SPEC §15.7 #27). */
  plan: WeekPlan;
  /** Per-material events, so the watch page knows where to resume. */
  signals: Map<string, MaterialSignals>;
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

  const signals = await materialSignals(
    student.id,
    mats.map((m) => m.id),
  );

  return {
    module,
    cohort,
    materials: mats,
    hasSubmission: !!sub,
    isCurrent,
    plan: planWeek(weekInputFrom(module, mats, signals, !!sub)),
    signals,
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

// --- /app home: My courses (SPEC §15.7 #24) ---------------------------------

export type HomeCourse = {
  cohort: Cohort;
  paused: boolean;
  totalModules: number;
  /** The highest planned week: the M in "Week N of M". */
  lastWeekNumber: number;
  releasedCount: number;
  completedCount: number;
  currentWeekNumber: number | null;
  /** The Continue deep link: this course's current module. */
  continueModuleId: string | null;
  /** The current module's title when it released within the last 7 days. */
  newThisWeek: string | null;
  /** The overall current course (the one orange CTA on the home). */
  hero: boolean;
};
export type StudentHome = { courses: HomeCourse[]; catalog: CatalogCourse[]; access: StudentAccess };

/**
 * One card per enrollment (active and paused), each Continue deep-linking
 * into that course's OWN current module (per-course pickCurrent); the
 * overall hero course carries the single orange CTA.
 */
export async function studentHome(student: User): Promise<StudentHome> {
  const [list, { mine, catalog }] = await Promise.all([
    studentModuleList(student),
    studentCourses(student),
  ]);
  const entriesByCohort = new Map<string, ModuleListEntry[]>();
  for (const e of [list.current, ...list.olderReleased, ...list.future]) {
    if (!e) continue;
    entriesByCohort.set(e.cohort.id, [...(entriesByCohort.get(e.cohort.id) ?? []), e]);
  }
  const heroCohortId = list.current?.cohort.id ?? null;
  const courses: HomeCourse[] = mine.map(({ cohort, enrollment, releasedCount, completedCount }) => {
    const entries = entriesByCohort.get(cohort.id) ?? [];
    const releasedHere = entries
      .filter((e) => e.state === "open")
      .map((e) => ({ ...e.module, courseTitle: cohort.name }));
    const cur = pickCurrent(releasedHere);
    return {
      cohort,
      paused: enrollment.status === "paused",
      totalModules: entries.length,
      lastWeekNumber: entries.reduce((max, e) => Math.max(max, e.module.weekNumber), 0),
      releasedCount,
      completedCount,
      currentWeekNumber: cur?.weekNumber ?? null,
      continueModuleId: cur?.id ?? null,
      newThisWeek: cur && isNewRelease(cur.releaseDate) ? cur.title : null,
      hero: cohort.id === heroCohortId,
    };
  });
  return { courses, catalog, access: list.access };
}

// --- /app/courses/[id]: inside one course (SPEC §15.7 #24) -------------------

export type CourseWeekRow = {
  module: Module;
  released: boolean;
  hasSubmission: boolean;
  /** This course's current week (kept for the rail's ordering cues). */
  isCurrent: boolean;
  materialCounts: Record<string, number>;
  /** Released weeks only: how far along the path this student is. */
  plan: WeekPlan | null;
};
export type StudentCourseDetail = {
  cohort: Cohort;
  /** Ascending week order: the course-shaped rail. */
  rows: CourseWeekRow[];
  /** The weekly note of the latest released week, for the top card. */
  note: { text: string; date: Date } | null;
  /** The page's first card, and its single orange CTA (SPEC §15.7 #27). */
  resume: ResumeCard | null;
  completedCount: number;
  releasedCount: number;
};

/**
 * The course page. Null whenever the course must not exist for this student
 * (Rule 1: no ACTIVE enrollment — requested, paused, ended, or foreign —
 * and Rule 3: globally paused), so the page 404s even by direct URL.
 */
export async function studentCourseDetail(
  cohortId: string,
  student: User,
): Promise<StudentCourseDetail | null> {
  if (!isUuid(cohortId)) return null;
  const now = new Date();
  const access = await loadStudentAccess(student);
  if (!access.active) return null;
  if (!access.enrollments.some((e) => e.cohortId === cohortId && e.status === "active")) {
    return null;
  }
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
  if (!cohort) return null;

  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.cohortId, cohortId))
    .orderBy(asc(modules.weekNumber));
  const subs = await submissionMap(
    student.id,
    mods.map((m) => m.id),
  );
  const mats = mods.length
    ? await db
        .select()
        .from(materials)
        .where(
          inArray(
            materials.moduleId,
            mods.map((m) => m.id),
          ),
        )
        .orderBy(asc(materials.sortOrder), asc(materials.id))
    : [];
  const countsByModule = new Map<string, Record<string, number>>();
  for (const m of mats) {
    const c = countsByModule.get(m.moduleId) ?? {};
    c[m.type] = (c[m.type] ?? 0) + 1;
    countsByModule.set(m.moduleId, c);
  }

  const released = mods.filter((m) => m.releaseDate.getTime() <= now.getTime());
  const releasedIds = new Set(released.map((m) => m.id));
  // Only released weeks can have been watched, so only they need signals.
  const signals = await materialSignals(
    student.id,
    mats.filter((m) => releasedIds.has(m.moduleId)).map((m) => m.id),
  );
  const cur = pickCurrent(released.map((m) => ({ ...m, courseTitle: cohort.name })));
  const rows: CourseWeekRow[] = mods.map((module) => ({
    module,
    released: releasedIds.has(module.id),
    hasSubmission: subs.has(module.id),
    isCurrent: module.id === (cur?.id ?? null),
    materialCounts: countsByModule.get(module.id) ?? {},
    plan: releasedIds.has(module.id)
      ? planWeek(
          weekInputFrom(
            module,
            mats.filter((m) => m.moduleId === module.id),
            signals,
            subs.has(module.id),
          ),
        )
      : null,
  }));

  return {
    cohort,
    rows,
    note: cur?.description ? { text: cur.description, date: cur.releaseDate } : null,
    // Ascending week order: where the student left off is the first
    // released week still carrying a step.
    resume: resumeCard(rows.filter((r) => r.plan).map((r) => r.plan!)),
    completedCount: released.filter((m) => subs.has(m.id)).length,
    releasedCount: released.length,
  };
}
