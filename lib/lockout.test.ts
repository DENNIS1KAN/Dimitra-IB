import { describe, expect, it } from "vitest";
import { LOCK_MS, MAX_FAILURES, isLockedOut, nextLockoutState } from "./lockout";

const now = new Date("2026-08-22T12:00:00Z");

describe("login lockout", () => {
  it("counts failures without locking below the threshold", () => {
    let state = { failedLogins: 0, lockedUntil: null as Date | null };
    for (let i = 1; i < MAX_FAILURES; i++) {
      state = nextLockoutState(state.failedLogins, now);
      expect(state.failedLogins).toBe(i);
      expect(state.lockedUntil).toBeNull();
      expect(isLockedOut(state.lockedUntil, now)).toBe(false);
    }
  });

  it("the 10th failure locks for 15 minutes and resets the counter", () => {
    const state = nextLockoutState(MAX_FAILURES - 1, now);
    expect(state.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_MS);
    expect(state.failedLogins).toBe(0);
    expect(isLockedOut(state.lockedUntil, now)).toBe(true);
    expect(isLockedOut(state.lockedUntil, new Date(now.getTime() + LOCK_MS - 1))).toBe(true);
  });

  it("the lock expires exactly at locked_until", () => {
    const { lockedUntil } = nextLockoutState(MAX_FAILURES - 1, now);
    expect(isLockedOut(lockedUntil, new Date(now.getTime() + LOCK_MS))).toBe(false);
  });

  it("after an expired lock the account has a fresh allowance", () => {
    const locked = nextLockoutState(MAX_FAILURES - 1, now);
    const later = new Date(now.getTime() + LOCK_MS + 1);
    const next = nextLockoutState(locked.failedLogins, later);
    expect(next.failedLogins).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it("no lock state means not locked", () => {
    expect(isLockedOut(null, now)).toBe(false);
  });
});
