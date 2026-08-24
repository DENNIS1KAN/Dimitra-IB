import Link from "next/link";
import type { Module, Submission, User } from "@/db/schema";
import { Icon, ProgressBar } from "@/components/rts/core";
import { lastActivityLine } from "@/lib/activity";
import { formatDay, initials } from "@/lib/format";

// Progress by student (SPEC §15.7 #27): people first. One row per member of
// the course with an honest last-activity line, a jade bar and "x of y";
// expanding shows a chip per week. The by-week matrix stays one toggle away
// in ProgressMatrix. A <details> does the expanding, so this needs no
// JavaScript and no client component.

export type ProgressStudentRow = {
  student: User;
  /** This course's enrollment status for them. */
  status: string;
  /** enrollments.decided_at: when a pause was set. */
  decidedAt: Date | null;
};

export function ProgressStudents({
  modules,
  rows,
  subByKey,
  now,
}: {
  /** Every week of the course, ascending. */
  modules: Module[];
  rows: ProgressStudentRow[];
  /** `${studentId}:${moduleId}` -> submission. */
  subByKey: Map<string, Submission>;
  now: number;
}) {
  const releasedIds = new Set(
    modules.filter((m) => m.releaseDate.getTime() <= now).map((m) => m.id),
  );

  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
        No students in this course yet.
      </p>
    );
  }

  return (
    <div>
      {rows.map(({ student, status, decidedAt }) => {
        const done = modules.filter(
          (m) => releasedIds.has(m.id) && subByKey.has(`${student.id}:${m.id}`),
        ).length;
        const paused = status === "paused" || !student.active;
        return (
          <details key={student.id} className={`lmn-stud${paused ? " is-paused" : ""}`}>
            <summary>
              <span className="lmn-pav" aria-hidden="true">
                {initials(student.name)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <h3>{student.name}</h3>
                <p className="lmn-stud-sub">
                  {lastActivityLine(
                    {
                      lastSeenAt: student.lastSeenAt,
                      accountPaused: !student.active,
                      enrollmentPaused: status === "paused",
                      pausedAt: decidedAt,
                    },
                    new Date(now),
                  )}
                </p>
              </span>
              <ProgressBar
                value={done}
                total={releasedIds.size || 1}
                style={{ width: 110, flex: "none" }}
              />
              <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                {done} of {releasedIds.size}
              </span>
              <span className="lmn-stud-chev" aria-hidden="true">
                <Icon name="chevron_right" size={16} />
              </span>
            </summary>
            <div className="lmn-chips">
              {modules.map((m) => {
                const sub = subByKey.get(`${student.id}:${m.id}`);
                const week = `W${m.weekNumber}`;
                if (sub) {
                  return (
                    <Link
                      key={m.id}
                      href={`/admin/submissions/${sub.id}`}
                      className="lmn-chip-week is-ok"
                      title={`Open ${student.name}'s attempt for ${week}`}
                    >
                      <Icon name="check" size={11} strokeWidth={3.2} />
                      {week} · {formatDay(sub.createdAt)} · view
                    </Link>
                  );
                }
                return releasedIds.has(m.id) ? (
                  <span key={m.id} className="lmn-chip-week is-wait">
                    {week} · released, waiting
                  </span>
                ) : (
                  <span key={m.id} className="lmn-chip-week is-na">
                    {week} · not released
                  </span>
                );
              })}
              {modules.length === 0 && (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  This course has no weeks yet.
                </span>
              )}
            </div>
          </details>
        );
      })}
      <div className="lmn-legend">
        <span>
          <span className="lmn-sw" style={{ background: "var(--color-jade)" }} />
          Submitted, tap to view
        </span>
        <span>
          <span
            className="lmn-sw"
            style={{ background: "var(--surface-page)", border: "1px solid var(--border-card)" }}
          />
          Released, waiting
        </span>
        <span>
          <span className="lmn-sw" style={{ border: "1.5px dashed var(--border-card)" }} />
          Not released yet
        </span>
        <span>
          <span className="lmn-sw" style={{ background: "var(--color-linen)" }} />
          Paused student, dimmed
        </span>
      </div>
    </div>
  );
}
