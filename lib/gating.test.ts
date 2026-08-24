import { describe, expect, it } from "vitest";
import {
  courseAccess,
  isModuleComplete,
  isPaused,
  moduleState,
  solutionsVisible,
} from "./gating";

const NOW = new Date("2026-08-21T12:00:00Z");
const past = new Date("2026-08-17T09:00:00Z");
const future = new Date("2026-08-24T09:00:00Z");

const modA = (releaseDate: Date) => ({ cohortId: "cohort-a", releaseDate });
const modB = (releaseDate: Date) => ({ cohortId: "cohort-b", releaseDate });

type Status = "requested" | "active" | "paused" | "ended";
const student = (status: Status | null, active = true) => ({
  active,
  enrollments: status ? [{ cohortId: "cohort-a", status }] : [],
});

describe("Rule 1 — module visibility (enrollment-based, SPEC §15.2)", () => {
  it("opens a released module in an actively enrolled cohort", () => {
    expect(moduleState(modA(past), student("active"), NOW)).toBe("open");
  });

  it("opens a module released exactly now (release_date <= now)", () => {
    expect(moduleState(modA(NOW), student("active"), NOW)).toBe("open");
  });

  it("shows a future module in an active cohort as a locked teaser", () => {
    expect(moduleState(modA(future), student("active"), NOW)).toBe("locked-teaser");
  });

  it("hides everything in a cohort the student only REQUESTED", () => {
    expect(moduleState(modA(past), student("requested"), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("requested"), NOW)).toBe("invisible");
  });

  it("hides everything in a PAUSED enrollment — released or not", () => {
    expect(moduleState(modA(past), student("paused"), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("paused"), NOW)).toBe("invisible");
  });

  it("hides everything in an ENDED enrollment", () => {
    expect(moduleState(modA(past), student("ended"), NOW)).toBe("invisible");
  });

  it("never renders a cohort the student has no enrollment in", () => {
    expect(moduleState(modB(past), student("active"), NOW)).toBe("invisible");
    expect(moduleState(modB(future), student("active"), NOW)).toBe("invisible");
    expect(moduleState(modA(past), student(null), NOW)).toBe("invisible");
  });

  it("a paused enrollment hides only that course — the other keeps working", () => {
    const two = {
      active: true,
      enrollments: [
        { cohortId: "cohort-a", status: "paused" as const },
        { cohortId: "cohort-b", status: "active" as const },
      ],
    };
    expect(moduleState(modA(past), two, NOW)).toBe("invisible");
    expect(moduleState(modB(past), two, NOW)).toBe("open");
    expect(moduleState(modB(future), two, NOW)).toBe("locked-teaser");
  });

  it("opens nothing for a globally paused student (Rule 3 wins over everything)", () => {
    expect(moduleState(modA(past), student("active", false), NOW)).toBe("invisible");
    expect(moduleState(modA(future), student("active", false), NOW)).toBe("invisible");
  });
});

describe("course access (drives the course cards)", () => {
  it("reports the enrollment status for the cohort, or none", () => {
    expect(courseAccess(student("active"), "cohort-a")).toBe("active");
    expect(courseAccess(student("paused"), "cohort-a")).toBe("paused");
    expect(courseAccess(student("requested"), "cohort-a")).toBe("requested");
    expect(courseAccess(student("ended"), "cohort-a")).toBe("ended");
    expect(courseAccess(student("active"), "cohort-b")).toBe("none");
    expect(courseAccess(student(null), "cohort-a")).toBe("none");
  });
});

describe("Rule 2 — solutions gating", () => {
  it("hides solutions before any submission", () => {
    expect(solutionsVisible(false)).toBe(false);
  });

  it("reveals solutions once a submission exists", () => {
    expect(solutionsVisible(true)).toBe(true);
  });

  it("marks the module complete iff a submission exists", () => {
    expect(isModuleComplete(false)).toBe(false);
    expect(isModuleComplete(true)).toBe(true);
  });
});

describe("Rule 3 — paused behavior", () => {
  it("flags an inactive student as paused", () => {
    expect(isPaused({ active: false })).toBe(true);
  });

  it("does not flag an active student", () => {
    expect(isPaused({ active: true })).toBe(false);
  });
});
