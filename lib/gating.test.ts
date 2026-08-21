import { describe, expect, it } from "vitest";
import {
  isModuleComplete,
  isPaused,
  moduleState,
  solutionsVisible,
} from "./gating";

const NOW = new Date("2026-08-21T12:00:00Z");
const past = new Date("2026-08-17T09:00:00Z");
const future = new Date("2026-08-24T09:00:00Z");

const activeStudent = { cohortId: "cohort-a", active: true };
const pausedStudent = { cohortId: "cohort-a", active: false };
const adminLike = { cohortId: null, active: true };

describe("Rule 1 — module visibility", () => {
  it("opens a released module in the student's cohort", () => {
    expect(moduleState({ cohortId: "cohort-a", releaseDate: past }, activeStudent, NOW)).toBe(
      "open",
    );
  });

  it("opens a module released exactly now (release_date <= now)", () => {
    expect(moduleState({ cohortId: "cohort-a", releaseDate: NOW }, activeStudent, NOW)).toBe(
      "open",
    );
  });

  it("shows a future module in the cohort as a locked teaser", () => {
    expect(moduleState({ cohortId: "cohort-a", releaseDate: future }, activeStudent, NOW)).toBe(
      "locked-teaser",
    );
  });

  it("never renders another cohort's module — released or not", () => {
    expect(moduleState({ cohortId: "cohort-b", releaseDate: past }, activeStudent, NOW)).toBe(
      "invisible",
    );
    expect(moduleState({ cohortId: "cohort-b", releaseDate: future }, activeStudent, NOW)).toBe(
      "invisible",
    );
  });

  it("opens nothing for a paused student (Rule 3 wins over release state)", () => {
    expect(moduleState({ cohortId: "cohort-a", releaseDate: past }, pausedStudent, NOW)).toBe(
      "invisible",
    );
    expect(moduleState({ cohortId: "cohort-a", releaseDate: future }, pausedStudent, NOW)).toBe(
      "invisible",
    );
  });

  it("shows nothing to a user with no cohort (admin browsing student routes)", () => {
    expect(moduleState({ cohortId: "cohort-a", releaseDate: past }, adminLike, NOW)).toBe(
      "invisible",
    );
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
    expect(isPaused(pausedStudent)).toBe(true);
  });

  it("does not flag an active student", () => {
    expect(isPaused(activeStudent)).toBe(false);
  });
});
