import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, users, type Enrollment } from "@/db/schema";
import { Badge, Button, Card } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { createCohort, createStudent, resetStudentPassword, toggleStudentActive } from "./actions";

// /admin — students table: name, cohort, active toggle, last seen, account
// creation + password resets (SPEC §7). Plain and fast; no design effort (§12).
export default async function AdminStudents({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;

  const allCohorts = await db.select().from(cohorts).orderBy(cohorts.name);
  // users.lastSeenAt survives sign-out (sessions rows don't) and tracks
  // activity, not just sign-ins.
  const students = await db
    .select({ user: users, lastSeen: users.lastSeenAt })
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(desc(users.lastSeenAt));
  // Course standing per student (SPEC §15.3): one enrollment row per cohort.
  const enrollmentRows = await db
    .select({ enrollment: enrollments, cohortName: cohorts.name })
    .from(enrollments)
    .innerJoin(cohorts, eq(cohorts.id, enrollments.cohortId))
    .orderBy(cohorts.name);
  const byStudent = new Map<string, { enrollment: Enrollment; cohortName: string }[]>();
  for (const row of enrollmentRows) {
    const list = byStudent.get(row.enrollment.studentId) ?? [];
    list.push(row);
    byStudent.set(row.enrollment.studentId, list);
  }
  const enrollmentTone = (status: Enrollment["status"]) =>
    status === "active" ? "done" : status === "requested" ? "new" : "locked";

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
        Students
      </h1>

      {(ok === "created" || ok === "password-set") && (
        <Card padding="16px" style={{ borderColor: "var(--action-primary)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
            {ok === "created"
              ? "Student created — share the username and password with them."
              : "Password updated — share the new password with the student."}
          </p>
        </Card>
      )}
      {error && (
        <Card padding="16px" style={{ borderColor: "#c4320a" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
            {error === "taken"
              ? "That username or email already has an account."
              : error === "password-short"
                ? "Passwords need at least 8 characters."
                : "Something was missing — check the form and try again."}
          </p>
        </Card>
      )}

      <Card padding="0">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Username</th>
                <th style={th}>Courses</th>
                <th style={th}>Status</th>
                <th style={th}>Last seen</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(({ user, lastSeen }) => (
                <tr key={user.id}>
                  <td style={{ ...td, fontWeight: 500 }}>
                    {user.name}
                    <span style={{ display: "block", fontWeight: 400, color: "var(--text-tertiary)" }}>
                      {user.email}
                    </span>
                  </td>
                  <td style={td}>{user.username}</td>
                  <td style={td}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(byStudent.get(user.id) ?? []).map(({ enrollment, cohortName }) => (
                        <div
                          key={enrollment.id}
                          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                        >
                          <span style={{ fontWeight: 500 }}>{cohortName}</span>
                          <Badge tone={enrollmentTone(enrollment.status)}>{enrollment.status}</Badge>
                        </div>
                      ))}
                      {(byStudent.get(user.id) ?? []).length === 0 && (
                        <span style={{ color: "var(--text-tertiary)" }}>No courses</span>
                      )}
                    </div>
                  </td>
                  <td style={td}>
                    {user.active ? (
                      <Badge tone="done" icon="check">
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="locked" icon="pause">
                        Paused
                      </Badge>
                    )}
                  </td>
                  <td style={td}>{lastSeen ? formatDay(lastSeen) : "never"}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <form action={toggleStudentActive}>
                        <input type="hidden" name="studentId" value={user.id} />
                        <Button variant="secondary" size="sm" type="submit">
                          {user.active ? "Pause" : "Unpause"}
                        </Button>
                      </form>
                      <form action={resetStudentPassword} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="studentId" value={user.id} />
                        <input
                          className="lmn-input"
                          type="password"
                          name="password"
                          required
                          minLength={8}
                          placeholder="new password"
                          autoComplete="new-password"
                          style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", width: 130 }}
                        />
                        <Button variant="ghost" size="sm" type="submit">
                          Set password
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td style={{ ...td, color: "var(--text-tertiary)" }} colSpan={6}>
                    No students yet — create the first account below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Card padding="20px">
          <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
            Create a student account
          </h2>
          <form
            action={createStudent}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <Input label="Name" name="name" placeholder="First and last name" />
            <Input label="Username" name="username" required placeholder="e.g. nikos" autoComplete="off" />
            <Input
              label="Password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="at least 8 characters"
              autoComplete="new-password"
            />
            <Input label="Email (contact only)" name="email" type="email" required placeholder="student@school.gr" />
            <label className="lmn-field">
              <span className="lmn-field-label">Cohort</span>
              <select className="lmn-input" name="cohortId" required defaultValue="">
                <option value="" disabled>
                  Pick a cohort
                </option>
                {allCohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="primary" size="sm" type="submit">
              Create account
            </Button>
          </form>
        </Card>

        <Card padding="20px">
          <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
            New cohort
          </h2>
          <form action={createCohort} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input label="Name" name="name" required placeholder="Chemistry HL 2027" />
            <Input label="Subject" name="subject" required placeholder="Chemistry" />
            <div style={{ display: "flex", gap: 10 }}>
              <label className="lmn-field" style={{ flex: 1 }}>
                <span className="lmn-field-label">Level</span>
                <select className="lmn-input" name="level" defaultValue="HL">
                  <option value="HL">HL</option>
                  <option value="SL">SL</option>
                </select>
              </label>
              <Input
                label="Exam year"
                name="examYear"
                type="number"
                required
                defaultValue={new Date().getFullYear() + 2}
                style={{ flex: 1 }}
              />
            </div>
            <Button variant="dark" size="sm" type="submit">
              Create cohort
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
