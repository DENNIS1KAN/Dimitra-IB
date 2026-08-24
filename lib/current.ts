// One definition of "this week's module", shared by the /app list and the
// module-detail page so the hero and the "New this week" badge can never
// disagree. Order (SPEC §15.7 #16, owner decision, M10): most recent release
// wins; ties → alphabetical course title; same course → higher week number.
// Never by id — (course, week) is unique, so the order is already total.

export type Releasable = {
  id: string;
  weekNumber: number;
  releaseDate: Date;
  courseTitle: string;
};

export function compareByRecency(a: Releasable, b: Releasable): number {
  return (
    b.releaseDate.getTime() - a.releaseDate.getTime() ||
    a.courseTitle.localeCompare(b.courseTitle) ||
    b.weekNumber - a.weekNumber
  );
}

/** The current ("this week") module among RELEASED modules; null if none. */
export function pickCurrent<T extends Releasable>(released: T[]): T | null {
  if (released.length === 0) return null;
  return [...released].sort(compareByRecency)[0];
}
