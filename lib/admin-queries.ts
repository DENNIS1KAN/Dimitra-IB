import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts,
  enrollments,
  materials,
  modules,
  submissions,
  users,
  type Cohort,
  type Enrollment,
  type Module,
  type User,
} from "@/db/schema";
import { missingTypes, type RequiredType } from "./content";
import { unreadForTutor } from "./messages";
import { isUuid } from "./validate";

// Data for the admin home and the course hub (SPEC §15.7 #23). Tiny tenant:
// load once, count in memory, exactly like the other admin pages.

export type CourseCard = {
  cohort: Cohort;
  activeCount: number;
  requestedCount: number;
  moduleCount: number;
  lastReleased: { module: Module; submitted: number } | null;
  nextRelease: Module | null;
};

export type NeedsYou = {
  requests: { enrollment: Enrollment; student: User; cohort: Cohort }[];
  unread: number;
  emptyListed: Cohort[];
  nudges: { module: Module; cohort: Cohort; missing: RequiredType[] }[];
};

export type AdminHome = { courses: CourseCard[]; needs: NeedsYou };

const NUDGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function materialCounts(): Promise<Map<string, Record<string, number>>> {
  const rows = await db.select({ moduleId: materials.moduleId, type: materials.type }).from(materials);
  const map = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const c = map.get(r.moduleId) ?? {};
    c[r.type] = (c[r.type] ?? 0) + 1;
    map.set(r.moduleId, c);
  }
  return map;
}

export async function adminHome(now = new Date()): Promise<AdminHome> {
  const allCohorts = await db.select().from(cohorts).orderBy(asc(cohorts.name));
  const allModules = await db.select().from(modules).orderBy(asc(modules.weekNumber));
  const allEnrollments = await db.select().from(enrollments);
  const subs = await db
    .select({ moduleId: submissions.moduleId, studentId: submissions.studentId })
    .from(submissions);
  const counts = await materialCounts();

  const byCohort = new Map(allCohorts.map((c) => [c.id, c]));
  const t = now.getTime();

  const courses: CourseCard[] = allCohorts.map((cohort) => {
    const mods = allModules.filter((m) => m.cohortId === cohort.id);
    // "x of y submitted" counts current ACTIVE members only, so a paused or
    // ended student's old submission can never read 4 of 3.
    const activeIds = new Set(
      allEnrollments
        .filter((e) => e.cohortId === cohort.id && e.status === "active")
        .map((e) => e.studentId),
    );
    const submittedFor = (moduleId: string) =>
      subs.filter((s) => s.moduleId === moduleId && activeIds.has(s.studentId)).length;
    const released = mods.filter((m) => m.releaseDate.getTime() <= t);
    const future = mods.filter((m) => m.releaseDate.getTime() > t);
    // Most recent release; releases share a course-level cadence, so the
    // latest instant (tie: higher week) is "the week that is out".
    const last = released.sort(
      (a, b) => b.releaseDate.getTime() - a.releaseDate.getTime() || b.weekNumber - a.weekNumber,
    )[0];
    const next = future.sort(
      (a, b) => a.releaseDate.getTime() - b.releaseDate.getTime() || a.weekNumber - b.weekNumber,
    )[0];
    return {
      cohort,
      activeCount: allEnrollments.filter((e) => e.cohortId === cohort.id && e.status === "active")
        .length,
      requestedCount: allEnrollments.filter(
        (e) => e.cohortId === cohort.id && e.status === "requested",
      ).length,
      moduleCount: mods.length,
      lastReleased: last ? { module: last, submitted: submittedFor(last.id) } : null,
      nextRelease: next ?? null,
    };
  });

  const requestRows = await db
    .select({ enrollment: enrollments, student: users, cohort: cohorts })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(cohorts, eq(cohorts.id, enrollments.cohortId))
    .where(eq(enrollments.status, "requested"))
    .orderBy(asc(enrollments.requestedAt));

  const nudges = allModules
    .filter((m) => {
      const r = m.releaseDate.getTime();
      return r > t && r <= t + NUDGE_WINDOW_MS;
    })
    .map((module) => ({
      module,
      cohort: byCohort.get(module.cohortId)!,
      missing: missingTypes(counts.get(module.id) ?? {}),
    }))
    .filter((n) => n.missing.length > 0)
    .sort((a, b) => a.module.releaseDate.getTime() - b.module.releaseDate.getTime());

  return {
    courses,
    needs: {
      requests: requestRows,
      unread: await unreadForTutor(),
      emptyListed: courses.filter((c) => c.cohort.isListed && c.moduleCount === 0).map((c) => c.cohort),
      nudges,
    },
  };
}

// --- The course hub ---------------------------------------------------------

export type CourseModuleRow = {
  module: Module;
  counts: Record<string, number>;
  missing: RequiredType[];
  submitted: number;
  released: boolean;
  /** Files this server stores for the week: what a delete would remove. */
  fileCount: number;
};

export type CourseMemberRow = {
  enrollment: Enrollment;
  student: User;
  done: number;
};

export type AdminCourse = {
  cohort: Cohort;
  activeCount: number;
  requestedCount: number;
  moduleRows: CourseModuleRow[];
  releasedCount: number;
  nextWeekNumber: number;
  members: CourseMemberRow[];
  /** Students with no enrollment row in this course, for the add form. */
  addable: User[];
};

export async function adminCourse(cohortId: string, now = new Date()): Promise<AdminCourse | null> {
  if (!isUuid(cohortId)) return null;
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
  if (!cohort) return null;
  const t = now.getTime();

  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.cohortId, cohortId))
    .orderBy(asc(modules.weekNumber));
  const counts = await materialCounts();
  const subs = await db.select().from(submissions);
  const subsByModule = new Map<string, number>();
  for (const s of subs) subsByModule.set(s.moduleId, (subsByModule.get(s.moduleId) ?? 0) + 1);
  // Link videos hold no bytes here, so only stored keys count as files.
  const fileRows = mods.length
    ? await db
        .select({ moduleId: materials.moduleId, storageKey: materials.storageKey })
        .from(materials)
        .where(
          inArray(
            materials.moduleId,
            mods.map((m) => m.id),
          ),
        )
    : [];
  const filesByModule = new Map<string, number>();
  for (const f of fileRows) {
    if (f.storageKey) filesByModule.set(f.moduleId, (filesByModule.get(f.moduleId) ?? 0) + 1);
  }

  const moduleRows: CourseModuleRow[] = mods.map((module) => {
    const c = counts.get(module.id) ?? {};
    return {
      module,
      counts: c,
      missing: missingTypes(c),
      submitted: subsByModule.get(module.id) ?? 0,
      released: module.releaseDate.getTime() <= t,
      fileCount: filesByModule.get(module.id) ?? 0,
    };
  });

  const enrollmentRows = await db
    .select({ enrollment: enrollments, student: users })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .where(eq(enrollments.cohortId, cohortId))
    .orderBy(asc(users.name));
  const releasedIds = new Set(moduleRows.filter((r) => r.released).map((r) => r.module.id));
  const subKey = new Set(subs.map((s) => `${s.studentId}:${s.moduleId}`));
  const members: CourseMemberRow[] = enrollmentRows.map(({ enrollment, student }) => ({
    enrollment,
    student,
    done: [...releasedIds].filter((id) => subKey.has(`${student.id}:${id}`)).length,
  }));

  const enrolledIds = new Set(enrollmentRows.map((r) => r.student.id));
  const allStudents = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));

  return {
    cohort,
    activeCount: members.filter((m) => m.enrollment.status === "active").length,
    requestedCount: members.filter((m) => m.enrollment.status === "requested").length,
    moduleRows,
    releasedCount: releasedIds.size,
    nextWeekNumber: mods.reduce((max, m) => Math.max(max, m.weekNumber), 0) + 1,
    members,
    addable: allStudents.filter((s) => !enrolledIds.has(s.id)),
  };
}
