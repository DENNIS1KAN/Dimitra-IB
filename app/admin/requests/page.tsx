import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, users } from "@/db/schema";
import { Button, Card } from "@/components/rts/core";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { approveRequest, declineRequest } from "../actions";

// /admin/requests: pending join requests, approve (→ active enrollment) or
// decline (SPEC §15.5). Plain and fast (§12).
export default async function AdminRequests() {
  await requireAdmin();
  const rows = await db
    .select({ enrollment: enrollments, student: users, cohort: cohorts })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.studentId))
    .innerJoin(cohorts, eq(cohorts.id, enrollments.cohortId))
    .where(eq(enrollments.status, "requested"))
    .orderBy(asc(enrollments.requestedAt));

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: "var(--text-caption)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".03em",
    color: "var(--text-tertiary)",
    padding: "8px 12px",
  };
  const td: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "var(--text-body-sm)",
    borderTop: "1px solid var(--border-card)",
    verticalAlign: "middle",
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
        Join requests
      </h1>
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
        Students ask to join from their Courses page. Approving makes the enrollment active
        straight away. Sort out payment with them first.
      </p>

      <Card padding="0">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Student</th>
                <th style={th}>Course</th>
                <th style={th}>Asked</th>
                <th style={th}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ enrollment, student, cohort }) => (
                <tr key={enrollment.id}>
                  <td style={{ ...td, fontWeight: 500 }}>
                    {student.name}
                    <span style={{ display: "block", fontWeight: 400, color: "var(--text-tertiary)" }}>
                      {student.email}
                    </span>
                  </td>
                  <td style={td}>{cohort.name}</td>
                  <td style={td}>{formatDay(enrollment.requestedAt)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <form action={approveRequest}>
                        <input type="hidden" name="enrollmentId" value={enrollment.id} />
                        <Button variant="primary" size="sm" type="submit">
                          Approve
                        </Button>
                      </form>
                      <form action={declineRequest}>
                        <input type="hidden" name="enrollmentId" value={enrollment.id} />
                        <Button variant="secondary" size="sm" type="submit">
                          Decline
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td style={{ ...td, color: "var(--text-tertiary)" }} colSpan={4}>
                    No pending requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
