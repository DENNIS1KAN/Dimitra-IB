import { asc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, modules, submissions, users } from "@/db/schema";
import { Card, Icon } from "@/components/lumen/core";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";

// /admin/progress — matrix: students × released modules, cell = submitted
// or not, with submission timestamp (SPEC §7).
export default async function AdminProgress() {
  await requireAdmin();

  const allCohorts = await db.select().from(cohorts).orderBy(cohorts.name);
  const released = await db
    .select()
    .from(modules)
    .where(lte(modules.releaseDate, new Date()))
    .orderBy(asc(modules.weekNumber));
  const students = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));
  const subs = await db.select().from(submissions);
  const subByKey = new Map(subs.map((s) => [`${s.studentId}:${s.moduleId}`, s]));

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: "var(--text-caption)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".03em",
    color: "var(--text-tertiary)",
    padding: "8px 12px",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "var(--text-body-sm)",
    borderTop: "1px solid var(--border-card)",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
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
        const cohortModules = released.filter((m) => m.cohortId === cohort.id);
        const cohortStudents = students.filter((s) => s.cohortId === cohort.id);
        if (cohortStudents.length === 0 && cohortModules.length === 0) return null;
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Student</th>
                    {cohortModules.map((m) => (
                      <th key={m.id} style={th}>
                        W{m.weekNumber}
                        <span style={{ display: "block", fontWeight: 500, textTransform: "none" }}>
                          {m.title.length > 22 ? `${m.title.slice(0, 22)}…` : m.title}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortStudents.map((s) => (
                    <tr key={s.id}>
                      <td style={{ ...td, fontWeight: 500 }}>
                        {s.name}
                        {!s.active && (
                          <span style={{ color: "var(--text-tertiary)" }}> (paused)</span>
                        )}
                      </td>
                      {cohortModules.map((m) => {
                        const sub = subByKey.get(`${s.id}:${m.id}`);
                        return (
                          <td key={m.id} style={td}>
                            {sub ? (
                              <span
                                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                              >
                                <Icon name="check_circle" size={18} color="var(--state-done)" />
                                <span>
                                  {formatDay(sub.createdAt)}
                                  {sub.fileKey ? " · file" : sub.note ? " · note" : ""}
                                </span>
                              </span>
                            ) : (
                              <Icon name="circle" size={16} color="var(--color-driftwood)" filled={false} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {cohortStudents.length === 0 && (
                    <tr>
                      <td style={{ ...td, color: "var(--text-tertiary)" }}>No students</td>
                      {cohortModules.map((m) => (
                        <td key={m.id} style={td} />
                      ))}
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
