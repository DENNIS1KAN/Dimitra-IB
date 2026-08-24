import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, modules, submissions, users, type Enrollment } from "@/db/schema";
import { Avatar, Badge, Button, IconButton, ProgressBar } from "@/components/rts/core";
import { Input } from "@/components/rts/forms";
import { requireAdmin } from "@/lib/admin";
import { formatDay, initials } from "@/lib/format";
import { isUuid } from "@/lib/validate";
import {
  addEnrollment,
  approveRequest,
  createStudent,
  declineRequest,
  resetStudentPassword,
  setEnrollmentStatus,
  toggleStudentActive,
} from "../actions";

// /admin/students (SPEC §15.7 #23): calm rows, and the direction C drawer.
// A row opens ?open=<id>, a full-screen sheet at 390px; every form inside
// posts the same server actions the old table used, with back pointing here.
export default async function AdminStudents({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { open, ok, error } = await searchParams;

  const allCohorts = await db.select().from(cohorts).orderBy(asc(cohorts.name));
  const students = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(desc(users.lastSeenAt));
  const enrollmentRows = await db
    .select({ enrollment: enrollments, cohortName: cohorts.name })
    .from(enrollments)
    .innerJoin(cohorts, eq(cohorts.id, enrollments.cohortId))
    .orderBy(asc(cohorts.name));
  const byStudent = new Map<string, { enrollment: Enrollment; cohortName: string }[]>();
  for (const row of enrollmentRows) {
    const list = byStudent.get(row.enrollment.studentId) ?? [];
    list.push(row);
    byStudent.set(row.enrollment.studentId, list);
  }

  // Server component renders per-request; "now" is stable within the render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const allModules = await db.select().from(modules);
  const allSubs = await db
    .select({ studentId: submissions.studentId, moduleId: submissions.moduleId })
    .from(submissions);
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
  const overall = (studentId: string) => {
    const list = (byStudent.get(studentId) ?? []).filter(
      ({ enrollment }) => enrollment.status === "active" || enrollment.status === "paused",
    );
    return list.reduce(
      (acc, { enrollment }) => {
        const c = completion(studentId, enrollment.cohortId);
        return { done: acc.done + c.done, released: acc.released + c.released };
      },
      { done: 0, released: 0 },
    );
  };
  const subCount = (studentId: string) => allSubs.filter((s) => s.studentId === studentId).length;

  const openStudent = open && isUuid(open) ? students.find((s) => s.id === open) : undefined;
  const tone = (status: Enrollment["status"]) =>
    status === "active" ? "done" : status === "requested" ? "new" : "locked";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Students
      </h1>

      {ok && (
        <div style={banner("var(--action-primary)")}>
          {ok === "created"
            ? "Student created. Share the username and password with them."
            : ok === "password-set"
              ? "Password updated. Share the new password with the student."
              : "Saved."}
        </div>
      )}
      {error && (
        <div style={banner("#c4320a")}>
          {error === "taken"
            ? "That username or email already has an account."
            : error === "password-short"
              ? "Passwords need at least 8 characters."
              : "Something was missing. Check the form and try again."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {students.map((s) => {
          const list = byStudent.get(s.id) ?? [];
          const requested = list.filter(({ enrollment }) => enrollment.status === "requested").length;
          const summary =
            list
              .filter(({ enrollment }) => enrollment.status === "active" || enrollment.status === "paused")
              .map(({ enrollment, cohortName }) =>
                enrollment.status === "paused" ? `${cohortName} (paused)` : cohortName,
              )
              .join(" · ") || "No courses";
          const o = overall(s.id);
          return (
            <Link
              key={s.id}
              href={`/admin/students?open=${s.id}`}
              scroll={false}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 15px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-cards)",
                color: "var(--text-primary)",
                flexWrap: "wrap",
              }}
            >
              <Avatar size="md" tone="neutral" initials={initials(s.name)} />
              <span style={{ flex: 1, minWidth: 160 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: "var(--text-strong)" }}>
                  {s.name}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--text-tertiary)" }}>{summary}</span>
              </span>
              {!s.active && <Badge tone="locked">Paused</Badge>}
              {requested > 0 && (
                <Badge tone="new">
                  {requested} request{requested === 1 ? "" : "s"}
                </Badge>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                  {o.done} of {o.released}
                </span>
                <ProgressBar value={o.done} total={o.released || 1} style={{ width: 72 }} />
              </span>
              <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                {s.lastSeenAt ? formatDay(s.lastSeenAt) : "never"}
              </span>
            </Link>
          );
        })}

        <Link
          href="/admin/students?open=new"
          scroll={false}
          style={{
            border: "1.5px dashed var(--border-divider)",
            borderRadius: "var(--radius-cards)",
            padding: "13px 15px",
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--action-primary)",
            textAlign: "center",
          }}
        >
          New student account
        </Link>
      </div>

      {(openStudent || open === "new") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(19,18,17,.35)",
          }}
        >
          <Link href="/admin/students" scroll={false} aria-label="Close" style={{ flex: 1 }} />
          <aside
            aria-label={openStudent ? `Student: ${openStudent.name}` : "New student account"}
            className="rts-drawer"
            style={{
              background: "var(--surface-page)",
              height: "100dvh",
              overflowY: "auto",
              boxShadow: "var(--shadow-card)",
              padding: "20px 20px 32px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {openStudent ? (
                <>
                  <Avatar size="lg" tone="neutral" initials={initials(openStudent.name)} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: 17, color: "var(--text-strong)" }}>
                      {openStudent.name}
                    </span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--text-tertiary)" }}>
                      {openStudent.username} · {openStudent.email}
                    </span>
                  </span>
                </>
              ) : (
                <span style={{ flex: 1, fontWeight: 800, fontSize: 17, color: "var(--text-strong)" }}>
                  New student account
                </span>
              )}
              <IconButton icon="close" variant="outline" size="sm" label="Close" href="/admin/students" />
            </div>

            {openStudent ? (
              <StudentDrawerBody
                student={openStudent}
                list={byStudent.get(openStudent.id) ?? []}
                completion={completion}
                subCount={subCount(openStudent.id)}
                allCohorts={allCohorts}
                tone={tone}
              />
            ) : (
              <CreateForm allCohorts={allCohorts} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function banner(color: string): React.CSSProperties {
  return {
    border: `1px solid ${color}`,
    borderRadius: "var(--radius-cards)",
    background: "var(--surface-card)",
    padding: "12px 15px",
    fontSize: "var(--text-body-sm)",
    fontWeight: 500,
    color: color === "#c4320a" ? "#c4320a" : "var(--text-primary)",
  };
}

function sectionTitle(text: string) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--text-heading-color)",
      }}
    >
      {text}
    </h2>
  );
}

function StudentDrawerBody({
  student,
  list,
  completion,
  subCount,
  allCohorts,
  tone,
}: {
  student: typeof users.$inferSelect;
  list: { enrollment: Enrollment; cohortName: string }[];
  completion: (studentId: string, cohortId: string) => { done: number; released: number };
  subCount: number;
  allCohorts: (typeof cohorts.$inferSelect)[];
  tone: (status: Enrollment["status"]) => "done" | "new" | "locked";
}) {
  const back = `/admin/students?open=${student.id}`;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {student.active ? (
          <Badge tone="done" icon="check">
            Active
          </Badge>
        ) : (
          <Badge tone="locked" icon="pause">
            Paused
          </Badge>
        )}
        <form action={toggleStudentActive}>
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="back" value={back} />
          <Button variant="secondary" size="sm" type="submit">
            {student.active ? "Pause access" : "Unpause access"}
          </Button>
        </form>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sectionTitle("Courses")}
        {list.map(({ enrollment, cohortName }) => {
          const c = completion(student.id, enrollment.cohortId);
          return (
            <div
              key={enrollment.id}
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-cards)",
                padding: "11px 13px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{cohortName}</span>
                <Badge tone={tone(enrollment.status)}>{enrollment.status}</Badge>
              </div>
              {(enrollment.status === "active" || enrollment.status === "paused") && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                    {c.done} of {c.released} submitted
                  </span>
                  <ProgressBar value={c.done} total={c.released || 1} style={{ width: 90 }} />
                </span>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {enrollment.status === "requested" ? (
                  <>
                    <form action={approveRequest}>
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <input type="hidden" name="back" value={back} />
                      <Button variant="primary" size="sm" type="submit">
                        Approve
                      </Button>
                    </form>
                    <form action={declineRequest}>
                      <input type="hidden" name="enrollmentId" value={enrollment.id} />
                      <input type="hidden" name="back" value={back} />
                      <Button variant="ghost" size="sm" type="submit">
                        Decline
                      </Button>
                    </form>
                  </>
                ) : (
                  <form action={setEnrollmentStatus} style={{ display: "inline-flex", gap: 6 }}>
                    <input type="hidden" name="enrollmentId" value={enrollment.id} />
                    <input type="hidden" name="back" value={back} />
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
            </div>
          );
        })}
        {list.length === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>No courses yet.</p>
        )}
        <form action={addEnrollment} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="back" value={back} />
          <select
            className="lmn-input"
            name="cohortId"
            required
            defaultValue=""
            aria-label={`Add ${student.name} to a course`}
            style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", flex: 1, minWidth: 0 }}
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
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sectionTitle("Password")}
        <form action={resetStudentPassword} style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="back" value={back} />
          <input
            className="lmn-input"
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="new password"
            autoComplete="new-password"
            style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", flex: 1, minWidth: 0 }}
          />
          <Button variant="ghost" size="sm" type="submit">
            Set password
          </Button>
        </form>
      </section>

      <Button variant="secondary" size="sm" href={`/admin/messages/${student.id}`}>
        Open message thread
      </Button>

      <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>
        Account created {formatDay(student.createdAt)} · Last seen{" "}
        {student.lastSeenAt ? formatDay(student.lastSeenAt) : "never"} · {subCount} submission
        {subCount === 1 ? "" : "s"}
      </p>
    </>
  );
}

function CreateForm({ allCohorts }: { allCohorts: (typeof cohorts.$inferSelect)[] }) {
  return (
    <form action={createStudent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="back" value="/admin/students?open=new" />
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
  );
}
