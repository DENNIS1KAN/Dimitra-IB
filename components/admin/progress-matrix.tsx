import Link from "next/link";
import type { Module, Submission, User } from "@/db/schema";
import { Icon } from "@/components/rts/core";
import { formatDay } from "@/lib/format";

// The students x modules matrix for ONE course (SPEC §15.7 #17, scoped per
// #23). Cell states: jade = submitted (links to the attempt), linen =
// released and pending, stone = unreleased. Row and column totals; sticky
// header row and student column inside the caller's scroll box.
export function ProgressMatrix({
  modules,
  students,
  membership,
  subByKey,
  now,
}: {
  modules: Module[];
  /** Active and paused members of the course. */
  students: User[];
  /** studentId -> enrollment status within this course. */
  membership: Map<string, string>;
  /** `${studentId}:${moduleId}` -> submission. */
  subByKey: Map<string, Submission>;
  now: number;
}) {
  const releasedIds = new Set(modules.filter((m) => m.releaseDate.getTime() <= now).map((m) => m.id));
  const rowDone = (studentId: string) =>
    modules.filter((m) => releasedIds.has(m.id) && subByKey.has(`${studentId}:${m.id}`)).length;
  const colDone = (moduleId: string) =>
    students.filter((s) => subByKey.has(`${s.id}:${moduleId}`)).length;
  const totalDone = students.reduce((sum, s) => sum + rowDone(s.id), 0);

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: "var(--text-caption)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".03em",
    color: "var(--text-tertiary)",
    padding: "8px 12px",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "var(--surface-card)",
    zIndex: 2,
  };
  const td: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "var(--text-body-sm)",
    borderTop: "1px solid var(--border-card)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };
  const stickyLeft: React.CSSProperties = {
    position: "sticky",
    left: 0,
    background: "var(--surface-card)",
    zIndex: 1,
  };

  return (
    <div style={{ overflow: "auto", maxHeight: "70vh" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, ...stickyLeft, zIndex: 3 }}>Student</th>
            {modules.map((m) => (
              <th key={m.id} style={th}>
                W{m.weekNumber}
                <span style={{ display: "block", fontWeight: 500, textTransform: "none" }}>
                  {m.title.length > 22 ? `${m.title.slice(0, 22)}…` : m.title}
                </span>
                {!releasedIds.has(m.id) && (
                  <span
                    style={{
                      display: "block",
                      fontWeight: 500,
                      textTransform: "none",
                      color: "var(--color-stone)",
                    }}
                  >
                    releases {formatDay(m.releaseDate)}
                  </span>
                )}
              </th>
            ))}
            <th style={th}>Done</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td style={{ ...td, ...stickyLeft, fontWeight: 500 }}>
                {s.name}
                {!s.active ? (
                  <span style={{ color: "var(--text-tertiary)" }}> (paused)</span>
                ) : membership.get(s.id) === "paused" ? (
                  <span style={{ color: "var(--text-tertiary)" }}> (course paused)</span>
                ) : null}
              </td>
              {modules.map((m) => {
                const sub = subByKey.get(`${s.id}:${m.id}`);
                if (sub) {
                  return (
                    <td key={m.id} style={{ ...td, background: "var(--color-jade)" }}>
                      {/* Opens the attempt (file + note): admin-only read path (SPEC §15.5). */}
                      <Link
                        href={`/admin/submissions/${sub.id}`}
                        title="Open this submission"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--color-white)",
                          fontWeight: 500,
                          textDecoration: "underline",
                          textDecorationColor: "rgba(255,255,255,.55)",
                        }}
                      >
                        <Icon name="check" size={14} strokeWidth={3} />
                        <span>
                          {formatDay(sub.createdAt)}
                          {sub.fileKey ? " · file" : sub.note ? " · note" : ""}
                        </span>
                      </Link>
                    </td>
                  );
                }
                const pendingStyle = releasedIds.has(m.id)
                  ? { background: "var(--color-linen)" }
                  : { background: "var(--color-stone)" };
                return <td key={m.id} style={{ ...td, ...pendingStyle }} />;
              })}
              <td style={{ ...td, fontWeight: 700 }}>
                {rowDone(s.id)} of {releasedIds.size}
              </td>
            </tr>
          ))}
          {students.length > 0 && (
            <tr>
              <td style={{ ...td, ...stickyLeft, fontWeight: 700 }}>Submitted</td>
              {modules.map((m) => (
                <td key={m.id} style={{ ...td, fontWeight: 500 }}>
                  {colDone(m.id)} of {students.length}
                </td>
              ))}
              <td style={{ ...td, fontWeight: 700 }}>
                {totalDone} of {releasedIds.size * students.length}
              </td>
            </tr>
          )}
          {students.length === 0 && (
            <tr>
              <td style={{ ...td, ...stickyLeft, color: "var(--text-tertiary)" }}>No students</td>
              {modules.map((m) => (
                <td key={m.id} style={td} />
              ))}
              <td style={td} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
