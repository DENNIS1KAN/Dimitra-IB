// Module content completeness (SPEC §15.7 #23): a week is complete when it
// holds at least one video plus slides, exercises, and solutions. Pure and
// tested; the course rail labels, the week-editor checklist, and the home
// "Needs you" nudge all read these helpers so they can never disagree.

export const REQUIRED_TYPES = ["video", "slides", "exercises", "solutions"] as const;
export type RequiredType = (typeof REQUIRED_TYPES)[number];

/** Display names, always plural: how the copy refers to each slot. */
export const TYPE_NAMES: Record<RequiredType, string> = {
  video: "videos",
  slides: "slides",
  exercises: "exercises",
  solutions: "solutions",
};

/** Which of the four slots have nothing uploaded yet. */
export function missingTypes(counts: Record<string, number>): RequiredType[] {
  return REQUIRED_TYPES.filter((t) => !((counts[t] ?? 0) > 0));
}

/** "videos and slides" · "slides, exercises and solutions". */
function joinNames(types: RequiredType[]): string {
  const names = types.map((t) => TYPE_NAMES[t]);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Rail label: "Complete" · "Empty" · "Solutions missing". */
export function completenessLabel(counts: Record<string, number>): string {
  const missing = missingTypes(counts);
  if (missing.length === 0) return "Complete";
  if (missing.length === REQUIRED_TYPES.length) return "Empty";
  const names = joinNames(missing);
  return `${names.charAt(0).toUpperCase()}${names.slice(1)} missing`;
}

/** The home nudge headline: "Week 7 of Chemistry HL is missing its solutions". */
export function nudgeLine(week: number, courseName: string, missing: RequiredType[]): string {
  return `Week ${week} of ${courseName} is missing its ${joinNames(missing)}`;
}

/** The "Ready for Monday?" one-liner under the checklist. */
export function readySummary(
  week: number,
  missing: RequiredType[],
): { lead: string; rest: string } {
  if (missing.length === 0) {
    return { lead: `Week ${week} is ready.`, rest: "It releases itself on the release day." };
  }
  if (missing.length === 1) {
    return {
      lead: "One item left.",
      rest: `Add the ${TYPE_NAMES[missing[0]]} and week ${week} is ready to release itself.`,
    };
  }
  return {
    lead: `${missing.length} items left.`,
    rest: `Fill the slots and week ${week} is ready to release itself.`,
  };
}
