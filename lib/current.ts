// One definition of "this week's module", shared by the /app list and the
// module-detail page so the hero and the "New this week" badge can never
// disagree. Order (SPEC §15.7 #9, owner decision): most recent release
// wins; ties → the NEAREST due date (undated last); still tied →
// alphabetical course title; same course → higher week number. Never by id
// — (course, week) is unique, so the order is already total.

export type Releasable = {
  id: string;
  weekNumber: number;
  releaseDate: Date;
  dueDate: Date | null;
  courseTitle: string;
};

const dueMs = (m: Releasable) => m.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;

export function compareByRecency(a: Releasable, b: Releasable): number {
  return (
    b.releaseDate.getTime() - a.releaseDate.getTime() ||
    dueMs(a) - dueMs(b) ||
    a.courseTitle.localeCompare(b.courseTitle) ||
    b.weekNumber - a.weekNumber
  );
}

/** The current ("this week") module among RELEASED modules; null if none. */
export function pickCurrent<T extends Releasable>(released: T[]): T | null {
  if (released.length === 0) return null;
  return [...released].sort(compareByRecency)[0];
}
