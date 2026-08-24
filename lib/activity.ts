// The one-line "when did I last see this person" copy on the admin progress
// tab (SPEC §15.7 #27). Honest above all: a student who has never signed in
// says exactly that, rather than borrowing the account's creation date.
// Pure and tested; the tutor's timezone decides what "today" means, because
// the server runs UTC and she does not.

import { formatDay } from "./format";
import { wallClock } from "./tz";

export type ActivityInput = {
  /** users.last_seen_at: stamped on sign-in and refreshed on activity. */
  lastSeenAt: Date | null;
  /** users.active is false: Lever 1, the global pause (Rule 3). */
  accountPaused: boolean;
  /** This course's enrollment is paused. */
  enrollmentPaused: boolean;
  /** enrollments.decided_at: when that pause was set. */
  pausedAt: Date | null;
};

const dayKey = (d: Date) => {
  const w = wallClock(d);
  return `${w.y}-${w.mo}-${w.d}`;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Last active today" · "Never signed in" · "Paused Sat 22 Aug". */
export function lastActivityLine(input: ActivityInput, now = new Date()): string {
  if (input.enrollmentPaused) {
    return input.pausedAt ? `Paused ${formatDay(input.pausedAt)}` : "Paused in this course";
  }
  if (input.accountPaused) return "Access paused";
  const seen = input.lastSeenAt;
  if (!seen) return "Never signed in";
  if (dayKey(seen) === dayKey(now)) return "Last active today";
  if (dayKey(seen) === dayKey(new Date(now.getTime() - DAY_MS))) return "Last active yesterday";
  return `Last active ${formatDay(seen)}`;
}
