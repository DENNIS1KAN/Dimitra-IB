import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, modules, submissions, users } from "@/db/schema";
import { Card, Icon } from "@/components/rts/core";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";

// /admin/progress: students x modules per cohort. Cell states (SPEC §15.7
// #17): jade = submitted (links to the attempt), linen = released and still
// pending, stone = unreleased. Row and column totals; sticky header row and
// student column inside each card's own scroll box.
export default async function AdminProgress() {
  await requireAdmin();

  const allCohorts = await db.select().from(cohorts).orderBy(cohorts.name);
  const allModules = await db.select().from(modules).orderBy(asc(modules.weekNumber));
  // Server component renders per-request; "now" is stable within the render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const students = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));
  const subs = await db.select().from(submissions);
  const subByKey = new Map(subs.map((s) => [`${s.studentId}:${s.moduleId}`, s]));
  // Rows come from enrollments (SPEC §15.3): active and paused members are
  // shown (paused marked); requested and ended ones are not in the course.
  const allEnrollments = await db.select().from(enrollments);
  const membership = new Map(allEnrollments.map((e) => [`${e.studentId}:${e.cohortId}`, e.status]));

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Progress
      </h1>

      {allCohorts.map((cohort) => {
        const cohortModules = allModules.filter((m) => m.cohortId === cohort.id);
        const releasedIds = new Set(
          cohortModules.filter((m) => m.releaseDate.getTime() <= now).map((m) => m.id),
        );
        const cohortStudents = students.filter((s) => {
          const status = membership.get(`${s.id}:${cohort.id}`);
          return status === "active" || status === "paused";
        });
        if (cohortStudents.length === 0 && cohortModules.length === 0) return null;
        const rowDone = (studentId: string) =>
          cohortModules.filter((m) => releasedIds.has(m.id) && subByKey.has(`${studentId}:${m.id}`))
            .length;
        const colDone = (moduleId: string) =>
          cohortStudents.filter((s) => subByKey.has(`${s.id}:${moduleId}`)).length;
        const totalDone = cohortStudents.reduce((sum, s) => sum + rowDone(s.id), 0);
        return (
          <Card key={cohort.id} padding="0">
            <h2
              style={{
                margin: 0,
                padding: "14px 12px 6px",
                fontSize: "var(--text-body)",
                fontWeight: 700,
              }}
            >
              {cohort.name}
            </h2>
            <div style={{ overflow: "auto", maxHeight: "70vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, ...stickyLeft, zIndex: 3 }}>Student</th>
                    {cohortModules.map((m) => (
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
                  {cohortStudents.map((s) => (
                    <tr key={s.id}>
                      <td style={{ ...td, ...stickyLeft, fontWeight: 500 }}>
                        {s.name}
                        {!s.active ? (
                          <span style={{ color: "var(--text-tertiary)" }}> (paused)</span>
                        ) : membership.get(`${s.id}:${cohort.id}`) === "paused" ? (
                          <span style={{ color: "var(--text-tertiary)" }}> (course paused)</span>
                        ) : null}
                      </td>
                      {cohortModules.map((m) => {
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
                  {cohortStudents.length > 0 && (
                    <tr>
                      <td style={{ ...td, ...stickyLeft, fontWeight: 700 }}>Submitted</td>
                      {cohortModules.map((m) => (
                        <td key={m.id} style={{ ...td, fontWeight: 500 }}>
                          {colDone(m.id)} of {cohortStudents.length}
                        </td>
                      ))}
                      <td style={{ ...td, fontWeight: 700 }}>
                        {totalDone} of {releasedIds.size * cohortStudents.length}
                      </td>
                    </tr>
                  )}
                  {cohortStudents.length === 0 && (
                    <tr>
                      <td style={{ ...td, ...stickyLeft, color: "var(--text-tertiary)" }}>No students</td>
                      {cohortModules.map((m) => (
                        <td key={m.id} style={td} />
                      ))}
                      <td style={td} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
