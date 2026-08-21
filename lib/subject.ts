// Subject → color token (DESIGN.md §1: one color per class; assignment
// lives in product data — here, derived from the cohort's subject).
const bySubject: Record<string, string> = {
  chemistry: "var(--subject-chemistry)",
  mathematics: "var(--subject-plum)",
  math: "var(--subject-plum)",
  physics: "var(--subject-celeste)",
  biology: "var(--subject-orange)",
};

export function subjectColor(subject: string | undefined | null): string {
  if (!subject) return "var(--subject-indigo)";
  return bySubject[subject.trim().toLowerCase()] ?? "var(--subject-indigo)";
}
