import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cohorts,
  materials,
  modules,
  submissions,
  type Material,
  type Module,
  type User,
} from "@/db/schema";
import { compareByRecency, pickCurrent } from "./current";
import { isModuleComplete, moduleState, type ModuleState } from "./gating";

export type ModuleListEntry = {
  module: Module;
  state: ModuleState;
  complete: boolean;
  materialCounts: Record<string, number>;
};

export type StudentModuleList = {
  cohort: typeof cohorts.$inferSelect | null;
  current: ModuleListEntry | null;
  olderReleased: ModuleListEntry[];
  future: ModuleListEntry[];
  completedCount: number;
  releasedCount: number;
};

/**
 * Everything /app needs. Cohort filtering happens in SQL (other cohorts'
 * modules never leave the DB layer — Rule 1's "invisible"); open/teaser
 * classification goes through lib/gating so the tested rules are the only
 * decision point.
 */
export async function studentModuleList(student: User): Promise<StudentModuleList> {
  if (!student.cohortId) {
    return {
      cohort: null,
      current: null,
      olderReleased: [],
      future: [],
      completedCount: 0,
      releasedCount: 0,
    };
  }
  const now = new Date();
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, student.cohortId));
  const rows = await db
    .select()
    .from(modules)
    .where(eq(modules.cohortId, student.cohortId))
    .orderBy(asc(modules.weekNumber));

  const subs = rows.length
    ? await db
        .select({ moduleId: submissions.moduleId })
        .from(submissions)
        .where(
          and(
            eq(submissions.studentId, student.id),
            inArray(
              submissions.moduleId,
              rows.map((m) => m.id),
            ),
          ),
        )
    : [];
  const submitted = new Set(subs.map((s) => s.moduleId));

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

  const entries: ModuleListEntry[] = rows.map((module) => ({
    module,
    state: moduleState(module, student, now),
    complete: isModuleComplete(submitted.has(module.id)),
    materialCounts: countsByModule.get(module.id) ?? {},
  }));

  const released = entries.filter((e) => e.state === "open");
  const future = entries
    .filter((e) => e.state === "locked-teaser")
    .sort((a, b) => a.module.releaseDate.getTime() - b.module.releaseDate.getTime());
  // Hero = "this week" per the shared lib/current rule (most recent release).
  const currentModule = pickCurrent(released.map((e) => e.module));
  const current = released.find((e) => e.module.id === currentModule?.id) ?? null;
  const olderReleased = released
    .filter((e) => e.module.id !== currentModule?.id)
    .sort((a, b) => compareByRecency(a.module, b.module)); // newest first below the hero

  return {
    cohort: cohort ?? null,
    current,
    olderReleased,
    future,
    completedCount: released.filter((e) => e.complete).length,
    releasedCount: released.length,
  };
}

export type StudentModuleDetail = {
  module: Module;
  cohort: typeof cohorts.$inferSelect;
  materials: Material[];
  hasSubmission: boolean;
  isCurrent: boolean;
};

/**
 * Module page data. Returns null when the module must not exist for this
 * student — other cohort, unreleased, or paused (Rule 1: invisible even by
 * direct URL → the page 404s).
 */
export async function studentModuleDetail(
  moduleId: string,
  student: User,
): Promise<StudentModuleDetail | null> {
  const now = new Date();
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return null;
  if (moduleState(module, student, now) !== "open") return null;

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
  const releasedSiblings = siblings.filter((m) => m.releaseDate.getTime() <= now.getTime());
  // Same rule as the /app hero — the list and this badge can never disagree.
  const isCurrent = pickCurrent(releasedSiblings)?.id === module.id;

  return { module, cohort, materials: mats, hasSubmission: !!sub, isCurrent };
}

/** "3 videos · slides · exercises" — counts derived from material rows. */
export function materialMeta(counts: Record<string, number>): string {
  const parts: string[] = [];
  if (counts.video) parts.push(`${counts.video} video${counts.video === 1 ? "" : "s"}`);
  if (counts.slides) parts.push("slides");
  if (counts.exercises) parts.push("exercises");
  return parts.join(" · ");
}
