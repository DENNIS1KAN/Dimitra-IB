// Subject → color token (SPEC §15.7 #13, M10 palette audit): chemistry is
// blue, every other subject is indigo. The per-subject spread from
// tokens.css (plum, celeste, orange) was retired with the extra hexes.
export function subjectColor(subject: string | undefined | null): string {
  if (subject?.trim().toLowerCase() === "chemistry") return "var(--subject-chemistry)";
  return "var(--subject-indigo)";
}
