// Login brute-force lockout, as pure functions over the two users columns
// (failed_logins, locked_until) so the policy is trivially unit-testable.
// The login action never reveals lock state — locked, unknown username, and
// wrong password all answer with the same generic error.

export const MAX_FAILURES = 10;
export const LOCK_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * State after one more failed attempt. The failure that reaches
 * MAX_FAILURES starts a lock and resets the counter, so after the lock
 * expires the account gets a fresh allowance.
 */
export function nextLockoutState(
  failedLogins: number,
  now: Date,
): { failedLogins: number; lockedUntil: Date | null } {
  const failures = failedLogins + 1;
  if (failures >= MAX_FAILURES) {
    return { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) };
  }
  return { failedLogins: failures, lockedUntil: null };
}
