import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, modules, submissions, users, type Enrollment } from "@/db/schema";
import { Badge, Button, Card, ProgressBar } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import {
  addEnrollment,
  createStudent,
  resetStudentPassword,
  setEnrollmentStatus,
  toggleStudentActive,
} from "./actions";

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

  // Progress at a glance (SPEC §15.7 #17): submitted x of y released, per
  // student per course. Tiny tenant; load once and count in memory.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const allModules = await db.select().from(modules);
  const allSubs = await db.select({ studentId: submissions.studentId, moduleId: submissions.moduleId }).from(submissions);
  const subSet = new Set(allSubs.map((s) => `${s.studentId}:${s.moduleId}`));
  const releasedByCohort = new Map<string, string[]>();
  for (const m of allModules) {
    if (m.releaseDate.getTime() > now) continue;
    releasedByCohort.set(m.cohortId, [...(releasedByCohort.get(m.cohortId) ?? []), m.id]);
  }
  const completion = (studentId: string, cohortId: string) => {
    const released = releasedByCohort.get(cohortId) ?? [];
    return {
      done: released.filter((id) => subSet.has(`${studentId}:${id}`)).length,
      released: released.length,
    };
  };

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
                          {(enrollment.status === "active" || enrollment.status === "paused") &&
                            (() => {
                              const c = completion(user.id, enrollment.cohortId);
                              return (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span
                                    style={{
                                      fontSize: "var(--text-caption)",
                                      color: "var(--text-tertiary)",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {c.done} of {c.released}
                                  </span>
                                  <ProgressBar value={c.done} total={c.released || 1} style={{ width: 72 }} />
                                </span>
                              );
                            })()}
                          {enrollment.status !== "requested" && (
                            <form action={setEnrollmentStatus} style={{ display: "inline-flex", gap: 2 }}>
                              <input type="hidden" name="enrollmentId" value={enrollment.id} />
                              {enrollment.status === "active" ? (
                                <Button variant="ghost" size="sm" type="submit" name="status" value="paused">
                                  Pause
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" type="submit" name="status" value="active">
                                  Resume
                                </Button>
                              )}
                              {enrollment.status !== "ended" && (
                                <Button variant="ghost" size="sm" type="submit" name="status" value="ended">
                                  End
                                </Button>
                              )}
                            </form>
                          )}
                        </div>
                      ))}
                      {(byStudent.get(user.id) ?? []).length === 0 && (
                        <span style={{ color: "var(--text-tertiary)" }}>No courses</span>
                      )}
                      <form action={addEnrollment} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="studentId" value={user.id} />
                        <select
                          className="lmn-input"
                          name="cohortId"
                          required
                          defaultValue=""
                          aria-label={`Add ${user.name} to a course`}
                          style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", width: 190 }}
                        >
                          <option value="" disabled>
                            Add to course…
                          </option>
                          {allCohorts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Button variant="ghost" size="sm" type="submit">
                          Add
                        </Button>
                      </form>
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
                  <td style={td}>
                    {/* Stacked on purpose (SPEC §15.7 #17): side by side these
                        overflowed and truncated "Set password". */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
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

      <div style={{ maxWidth: 480 }}>
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
              <span className="lmn-field-label">First course (an active enrollment)</span>
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

      </div>
    </div>
  );
}
