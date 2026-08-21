// One definition of "this week's module", shared by the /app list and the
// module-detail page so the hero and the "New this week" badge can never
// disagree: most recent release date wins; ties break by higher week number,
// then by id so the answer is deterministic.

export type Releasable = { id: string; weekNumber: number; releaseDate: Date };

export function compareByRecency(a: Releasable, b: Releasable): number {
  return (
    b.releaseDate.getTime() - a.releaseDate.getTime() ||
    b.weekNumber - a.weekNumber ||
    a.id.localeCompare(b.id)
  );
}

/** The current ("this week") module among RELEASED modules; null if none. */
export function pickCurrent<T extends Releasable>(released: T[]): T | null {
  if (released.length === 0) return null;
  return [...released].sort(compareByRecency)[0];
}
