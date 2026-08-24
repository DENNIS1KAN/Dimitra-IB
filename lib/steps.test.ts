import { describe, expect, it } from "vitest";
import {
  END_SLACK_SECONDS,
  planWeek,
  resumeCard,
  secondsLeft,
  videoDone,
  type StepVideo,
  type WeekInput,
} from "./steps";

// The week as a numbered path (SPEC §15.7 #27). These are the only rules
// that decide what a student sees as done, current or still ahead.

const video = (over: Partial<StepVideo> = {}): StepVideo => ({
  id: "v1",
  title: "Buffer systems explained",
  isLink: false,
  durationSeconds: 600,
  progressSeconds: 0,
  viewed: false,
  ...over,
});

const week = (over: Partial<WeekInput> = {}): WeekInput => ({
  moduleId: "m6",
  weekNumber: 6,
  videos: [video()],
  exercisesId: "ex",
  exercisesDownloaded: false,
  solutionsId: "sol",
  hasSubmission: false,
  ...over,
});

describe("videoDone", () => {
  it("is false while an uploaded video is mid-way", () => {
    expect(videoDone(video({ progressSeconds: 30 }))).toBe(false);
  });

  it("is true within the end slack of a known length", () => {
    expect(videoDone(video({ progressSeconds: 600 - END_SLACK_SECONDS }))).toBe(true);
    expect(videoDone(video({ progressSeconds: 600 - END_SLACK_SECONDS - 1 }))).toBe(false);
  });

  it("falls back to the view event when the length is still unknown", () => {
    expect(videoDone(video({ durationSeconds: null, progressSeconds: 900 }))).toBe(false);
    expect(videoDone(video({ durationSeconds: null, viewed: true }))).toBe(true);
  });

  it("completes a link video on the view event alone", () => {
    const link = video({ isLink: true, durationSeconds: null, progressSeconds: 0 });
    expect(videoDone(link)).toBe(false);
    expect(videoDone({ ...link, viewed: true })).toBe(true);
  });

  it("reports no time left for a link or an unmeasured file", () => {
    expect(secondsLeft(video({ isLink: true }))).toBeNull();
    expect(secondsLeft(video({ durationSeconds: null }))).toBeNull();
    expect(secondsLeft(video({ progressSeconds: 240 }))).toBe(360);
  });
});

describe("planWeek", () => {
  it("numbers videos first, then attempt, submit and solutions", () => {
    const plan = planWeek(week({ videos: [video({ id: "a" }), video({ id: "b" })] }));
    expect(plan.steps.map((s) => [s.number, s.kind])).toEqual([
      [1, "video"],
      [2, "video"],
      [3, "attempt"],
      [4, "submit"],
      [5, "solutions"],
    ]);
  });

  it("marks exactly one step current, and never the solutions", () => {
    const states = (input: WeekInput) =>
      planWeek(input).steps.filter((s) => s.state === "current");
    expect(states(week())).toHaveLength(1);
    // Submitted without watching: the unwatched video is still the action.
    const submitted = week({ hasSubmission: true });
    expect(states(submitted)).toHaveLength(1);
    expect(states(submitted)[0].kind).toBe("video");
  });

  it("advances the current step as events land", () => {
    const kindOfCurrent = (input: WeekInput) => planWeek(input).current?.kind ?? null;
    expect(kindOfCurrent(week())).toBe("video");
    const watched = week({ videos: [video({ progressSeconds: 600 })] });
    expect(kindOfCurrent(watched)).toBe("attempt");
    const downloaded = { ...watched, exercisesDownloaded: true };
    expect(kindOfCurrent(downloaded)).toBe("submit");
    const done = { ...downloaded, hasSubmission: true };
    expect(kindOfCurrent(done)).toBeNull();
    expect(planWeek(done).complete).toBe(true);
  });

  it("skips the download wait when the week has no exercises file", () => {
    const plan = planWeek(
      week({ videos: [video({ progressSeconds: 600 })], exercisesId: null }),
    );
    expect(plan.current?.kind).toBe("submit");
    expect(plan.steps.find((s) => s.kind === "attempt")!.href).toBeNull();
  });

  it("keeps solutions locked until a submission exists (Rule 2)", () => {
    const locked = planWeek(week()).steps.find((s) => s.kind === "solutions")!;
    expect(locked.state).toBe("locked");
    expect(locked.href).toBeNull();

    const open = planWeek(week({ hasSubmission: true })).steps.find(
      (s) => s.kind === "solutions",
    )!;
    expect(open.state).toBe("done");
    expect(open.href).toBe("/api/materials/sol");
  });

  it("says so honestly when solutions are unlocked but not posted", () => {
    const step = planWeek(week({ hasSubmission: true, solutionsId: null })).steps.find(
      (s) => s.kind === "solutions",
    )!;
    expect(step.href).toBeNull();
    expect(step.meta).toContain("not posted");
  });

  it("carries the saved position on an uploaded video, never on a link", () => {
    const mid = planWeek(week({ videos: [video({ progressSeconds: 34 })] })).steps[0];
    expect(mid.resumeSeconds).toBe(34);
    expect(mid.meta).toBe("9 minutes left");

    const barely = planWeek(week({ videos: [video({ progressSeconds: 3 })] })).steps[0];
    expect(barely.resumeSeconds).toBe(0); // below the floor: that is a start, not a resume

    const link = planWeek(
      week({ videos: [video({ isLink: true, durationSeconds: null, progressSeconds: 99 })] }),
    ).steps[0];
    expect(link.resumeSeconds).toBe(0);
  });

  it("gives every video step the watch page as its target", () => {
    const plan = planWeek(week({ videos: [video({ id: "vid-a" })] }));
    expect(plan.steps[0].href).toBe("/app/modules/m6/watch/vid-a");
  });
});

describe("resumeCard", () => {
  const planOf = (over: Partial<WeekInput>) => planWeek(week(over));

  it("resumes the exact video at the saved position", () => {
    const card = resumeCard([planOf({ videos: [video({ progressSeconds: 34 })] })])!;
    expect(card.mode).toBe("resume");
    expect(card.tag).toBe("Pick up where you left off");
    expect(card.cta).toBe("Resume");
    expect(card.href).toBe("/app/modules/m6/watch/v1");
    expect(card.meta).toBe("Week 6 · 9 minutes left · then the exercises");
  });

  it("reads Continue week N when nothing has been watched yet", () => {
    const card = resumeCard([planOf({})])!;
    expect(card.mode).toBe("continue");
    expect(card.cta).toBe("Continue week 6");
    expect(card.href).toBe("/app/modules/m6/watch/v1"); // the first incomplete step
  });

  it("reads Continue week N for a link video, and still targets it", () => {
    const card = resumeCard([
      planOf({ videos: [video({ isLink: true, durationSeconds: null })] }),
    ])!;
    expect(card.cta).toBe("Continue week 6");
    expect(card.href).toBe("/app/modules/m6/watch/v1");
  });

  it("targets the week itself once the next step is not a video", () => {
    const card = resumeCard([planOf({ videos: [video({ progressSeconds: 600 })] })])!;
    expect(card.cta).toBe("Continue week 6");
    expect(card.href).toBe("/app/modules/m6");
  });

  it("picks the earliest unfinished released week", () => {
    const w5 = planWeek(week({ moduleId: "m5", weekNumber: 5 }));
    const w6 = planWeek(week({ moduleId: "m6", weekNumber: 6 }));
    expect(resumeCard([w5, w6])!.weekNumber).toBe(5);
  });

  it("offers a review when every released week is finished", () => {
    const finished = planWeek(
      week({
        videos: [video({ progressSeconds: 600 })],
        exercisesDownloaded: true,
        hasSubmission: true,
      }),
    );
    const card = resumeCard([finished])!;
    expect(card.mode).toBe("review");
    expect(card.cta).toBe("Review week 6");
    expect(card.href).toBe("/app/modules/m6");
  });

  it("has nothing to show before the first release", () => {
    expect(resumeCard([])).toBeNull();
  });
});
