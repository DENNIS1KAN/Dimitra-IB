import { desc, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, sessions, users } from "@/db/schema";
import { Badge, Button, Card } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { createCohort, createStudentAndInvite, reinviteStudent, toggleStudentActive } from "./actions";

// /admin — students table: name, cohort, active toggle, last seen, invite
// (SPEC §7). Plain and fast; no design effort (§12).
export default async function AdminStudents({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; link?: string }>;
}) {
  await requireAdmin();
  const { ok, error, link } = await searchParams;

  const allCohorts = await db.select().from(cohorts).orderBy(cohorts.name);
  const students = await db
    .select({
      user: users,
      cohortName: cohorts.name,
      lastSeen: max(sessions.createdAt),
    })
    .from(users)
    .leftJoin(cohorts, eq(cohorts.id, users.cohortId))
    .leftJoin(sessions, eq(sessions.userId, users.id))
    .where(eq(users.role, "student"))
    .groupBy(users.id, cohorts.name)
    .orderBy(desc(sql`max(${sessions.createdAt})`));

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

      {ok === "invited" && link && (
        <Card padding="16px" style={{ borderColor: "var(--action-primary)" }}>
          <p style={{ margin: "0 0 6px", fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
            Invite created — the link was also printed to the server console
            {process.env.RESEND_API_KEY ? " and emailed" : ""}.
          </p>
          <code style={{ fontSize: 12, wordBreak: "break-all", color: "var(--text-secondary)" }}>
            {link}
          </code>
        </Card>
      )}
      {error && (
        <Card padding="16px" style={{ borderColor: "#c4320a" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
            {error === "email-taken"
              ? "That email already has an account."
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
                <th style={th}>Email</th>
                <th style={th}>Cohort</th>
                <th style={th}>Status</th>
                <th style={th}>Last seen</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(({ user, cohortName, lastSeen }) => (
                <tr key={user.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{user.name}</td>
                  <td style={td}>{user.email}</td>
                  <td style={td}>{cohortName ?? "—"}</td>
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
                      <form action={reinviteStudent}>
                        <input type="hidden" name="studentId" value={user.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          New invite link
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td style={{ ...td, color: "var(--text-tertiary)" }} colSpan={6}>
                    No students yet — invite the first one below.
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
            Invite a new student
          </h2>
          <form
            action={createStudentAndInvite}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <Input label="Name" name="name" placeholder="First and last name" />
            <Input label="Email" name="email" type="email" required placeholder="student@school.gr" />
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
              Create &amp; send invite
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
