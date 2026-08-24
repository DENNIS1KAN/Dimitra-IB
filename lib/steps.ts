// The week as a numbered path (SPEC §15.7 #27): one step per video, then
// Attempt, then Submit, then Solutions. Pure and tested, like lib/gating —
// the week page, the course page's resume card and the tests all read these
// functions, so the path a student sees can never disagree with itself.
//
// This adds no access rules. Rule 2 still decides the solutions step (it is
// locked until a submission exists) and Rule 1 still decides whether the week
// is reachable at all; everything here is presentation of events already
// captured.

export type StepKind = "video" | "attempt" | "submit" | "solutions";

/** done = behind you · current = the one action · waiting / locked = ahead. */
export type StepState = "done" | "current" | "waiting" | "locked";

export type StepVideo = {
  id: string;
  title: string;
  /** A pasted link (SPEC §15.7 #25) instead of a file this server stores. */
  isLink: boolean;
  /** Whole seconds, reported once by the player; null while unknown. */
  durationSeconds: number | null;
  /** The student's highest saved position for this material, in seconds. */
  progressSeconds: number;
  /** A `view` event exists: the student opened it at least once. */
  viewed: boolean;
};

export type WeekInput = {
  moduleId: string;
  weekNumber: number;
  videos: StepVideo[];
  /** The week's exercises material, when it has one. */
  exercisesId: string | null;
  /** A `download` event exists for that exercises material. */
  exercisesDownloaded: boolean;
  /** The week's solutions material, when it has one. */
  solutionsId: string | null;
  hasSubmission: boolean;
};

export type Step = {
  kind: StepKind;
  /** Stable list key: the material id for videos, the kind otherwise. */
  key: string;
  /** 1-based position in the path, as printed in the numbered disc. */
  number: number;
  state: StepState;
  title: string;
  meta: string;
  /** Where this step goes. Submit has none: it opens the box in place. */
  href: string | null;
  /** Videos only: the second a Resume would land on. */
  resumeSeconds: number;
  /** Videos only, and only once the length is known. */
  secondsLeft: number | null;
};

export type WeekPlan = {
  moduleId: string;
  weekNumber: number;
  steps: Step[];
  /** The single step carrying the action; null when the path is finished. */
  current: Step | null;
  /** Every video watched, exercises downloaded, attempt submitted. */
  complete: boolean;
  /**
   * Rule 2's own definition of a finished week (lib/gating.isModuleComplete):
   * an attempt exists. The rail has always called that "Done", so the resume
   * card must agree with it and move on to the next week.
   */
  submitted: boolean;
};

/**
 * Within this many seconds of the end counts as watched to the end: players
 * fire `ended` a beat before `duration`, and nobody sits through the last
 * frame of a recording.
 */
export const END_SLACK_SECONDS = 10;

/** Below this, "resume" would be indistinguishable from "start". */
export const RESUME_FLOOR_SECONDS = 5;

/**
 * Watched to the end. A link reports nothing back, so opening it is all we
 * ever know (SPEC §15.7 #25) — and an uploaded file whose length is still
 * unknown (never opened, or unplayable) falls back to the same rule, so a
 * broken file can never strand the path.
 */
export function videoDone(v: StepVideo): boolean {
  if (v.isLink) return v.viewed;
  if (v.durationSeconds !== null && v.durationSeconds > 0) {
    return v.progressSeconds >= v.durationSeconds - END_SLACK_SECONDS;
  }
  return v.viewed;
}

/** Seconds still to watch, or null when the length is unknown. */
export function secondsLeft(v: StepVideo): number | null {
  if (v.isLink || v.durationSeconds === null || v.durationSeconds <= 0) return null;
  return Math.max(0, v.durationSeconds - v.progressSeconds);
}

/** "6 minutes left" · "under a minute left" · "14 minutes". */
function timeLeftLabel(left: number): string {
  if (left <= 0) return "finished";
  if (left < 60) return "under a minute left";
  return `${Math.round(left / 60)} minute${Math.round(left / 60) === 1 ? "" : "s"} left`;
}

function videoMeta(v: StepVideo, done: boolean): string {
  if (done) return v.isLink ? "Opened" : "Watched";
  const left = secondsLeft(v);
  if (left !== null && v.progressSeconds >= RESUME_FLOOR_SECONDS) return timeLeftLabel(left);
  if (v.isLink) return "Opens on its own service, in a new tab";
  return "Not started yet";
}

export function planWeek(input: WeekInput): WeekPlan {
  const steps: Step[] = [];
  let n = 0;
  const next = () => ++n;

  for (const v of input.videos) {
    const done = videoDone(v);
    const resume = !v.isLink && !done && v.progressSeconds >= RESUME_FLOOR_SECONDS ? v.progressSeconds : 0;
    steps.push({
      kind: "video",
      key: v.id,
      number: next(),
      state: done ? "done" : "waiting",
      title: `Watch: ${v.title}`,
      meta: videoMeta(v, done),
      href: `/app/modules/${input.moduleId}/watch/${v.id}`,
      resumeSeconds: resume,
      secondsLeft: secondsLeft(v),
    });
  }

  // Attempt has no signal of its own: paper cannot report back. Downloading
  // the exercises is what we know, and a week with no exercises file has
  // nothing to wait for (SPEC §15.7 #27).
  const attemptDone =
    input.hasSubmission || input.exercisesId === null || input.exercisesDownloaded;
  steps.push({
    kind: "attempt",
    key: "attempt",
    number: next(),
    state: attemptDone ? "done" : "waiting",
    title: "Attempt the exercises on paper",
    meta: input.exercisesId
      ? "Work them the way the exam asks, before you look at anything"
      : "No exercise sheet this week: work from the slides",
    href: input.exercisesId ? `/api/materials/${input.exercisesId}?download=1` : null,
    resumeSeconds: 0,
    secondsLeft: null,
  });

  steps.push({
    kind: "submit",
    key: "submit",
    number: next(),
    state: input.hasSubmission ? "done" : "waiting",
    title: "Submit your attempt",
    meta: input.hasSubmission
      ? "Sent to Dimitra"
      : "A photo of honest working is enough",
    href: null, // the submit box opens in place, below the path
    resumeSeconds: 0,
    secondsLeft: null,
  });

  // Rule 2, unchanged: solutions exist for this student only after a
  // submission. It is the terminal step, never the "current" one.
  steps.push({
    kind: "solutions",
    key: "solutions",
    number: next(),
    state: input.hasSubmission ? "done" : "locked",
    title: "Solutions",
    meta: !input.hasSubmission
      ? "Unlock these by submitting, then check your work"
      : input.solutionsId
        ? "Unlocked: compare your working line by line"
        : "Unlocked. Dimitra has not posted this week's solutions yet",
    href: input.hasSubmission && input.solutionsId ? `/api/materials/${input.solutionsId}` : null,
    resumeSeconds: 0,
    secondsLeft: null,
  });

  // Exactly one current step: the first one still ahead of the student.
  // Solutions is excluded, so an unlocked-but-unopened solutions row never
  // steals the action from a video the student has yet to watch.
  const current = steps.find((s) => s.kind !== "solutions" && s.state !== "done") ?? null;
  if (current) current.state = "current";

  return {
    moduleId: input.moduleId,
    weekNumber: input.weekNumber,
    steps,
    current,
    complete: current === null,
    submitted: input.hasSubmission,
  };
}

// --- The course page's "Pick up where you left off" card --------------------

export type ResumeCard = {
  /** resume = back into a video mid-way · continue = start the next step · review = all done. */
  mode: "resume" | "continue" | "review";
  weekNumber: number;
  moduleId: string;
  /** The eyebrow above the title. */
  tag: string;
  title: string;
  meta: string;
  cta: string;
  href: string;
};

/** "Week 6 · 6 minutes left · then the exercises" */
function cardMeta(weekNumber: number, step: Step | null, after: Step | null): string {
  const parts = [`Week ${weekNumber}`];
  if (step?.kind === "video" && step.secondsLeft !== null && step.resumeSeconds > 0) {
    parts.push(timeLeftLabel(step.secondsLeft));
  }
  if (after) parts.push(`then ${shortName(after)}`);
  return parts.join(" · ");
}

function shortName(step: Step): string {
  switch (step.kind) {
    case "video":
      return "the next video";
    case "attempt":
      return "the exercises";
    case "submit":
      return "your attempt";
    case "solutions":
      return "the solutions";
  }
}

/**
 * The one card at the top of a course. Weeks arrive in ascending week order
 * and released-only; the first unfinished one is where the student left off.
 */
export function resumeCard(plans: WeekPlan[]): ResumeCard | null {
  if (plans.length === 0) return null;
  // A submitted week is done, whatever is left unwatched inside it: the rail
  // says "Done, solutions unlocked", so the card cannot send them back.
  const plan = plans.find((p) => !p.submitted && !p.complete);
  if (!plan) {
    const last = plans[plans.length - 1];
    return {
      mode: "review",
      weekNumber: last.weekNumber,
      moduleId: last.moduleId,
      tag: "You are up to date",
      title: `Week ${last.weekNumber} is done`,
      meta: "Every released week is submitted. The next one unlocks on its own.",
      cta: `Review week ${last.weekNumber}`,
      href: `/app/modules/${last.moduleId}`,
    };
  }
  const step = plan.current!;
  const after = plan.steps.find((s) => s.number > step.number && s.kind !== "solutions") ?? null;
  const resuming = step.kind === "video" && step.resumeSeconds > 0;
  return {
    mode: resuming ? "resume" : "continue",
    weekNumber: plan.weekNumber,
    moduleId: plan.moduleId,
    tag: resuming ? "Pick up where you left off" : "Next up",
    title: step.title,
    meta: cardMeta(plan.weekNumber, step, after),
    cta: resuming ? "Resume" : `Continue week ${plan.weekNumber}`,
    // The first incomplete step's own target: a video opens on the watch
    // page (which is where the view, the duration report and the resume
    // live), anything else opens the week.
    href: step.kind === "video" ? step.href! : `/app/modules/${plan.moduleId}`,
  };
}
