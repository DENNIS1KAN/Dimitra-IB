import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { submissions, type Enrollment } from "@/db/schema";
import { Badge, Button, Icon, ProgressBar } from "@/components/rts/core";
import { Input, TextArea } from "@/components/rts/forms";
import { ProgressMatrix } from "@/components/admin/progress-matrix";
import { ReleaseDateField } from "@/components/admin/release-date-field";
import { adminCourse } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/admin";
import { completenessLabel } from "@/lib/content";
import { formatDay } from "@/lib/format";
import { toDayText } from "@/lib/tz";
import {
  addEnrollment,
  approveRequest,
  createModule,
  declineRequest,
  deleteModule,
  setEnrollmentStatus,
  updateCohort,
  updateModule,
} from "../../actions";

const TABS = ["modules", "students", "progress", "details"] as const;
type Tab = (typeof TABS)[number];

// /admin/courses/[id] (SPEC §15.7 #23): one course, four tabs. Modules is
// the default: the week rail plus the inline "Add week N" composer.
export default async function AdminCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    ok?: string;
    error?: string;
    // Carried back by createModule on week-taken so the composer isn't wiped.
    weekNumber?: string;
    title?: string;
    releaseDay?: string;
    // M13 (SPEC §15.7 #27): the week menu's two inline states.
    edit?: string;
    confirm?: string;
    /** The progress tab's By student / By week toggle. */
    view?: string;
  }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const course = await adminCourse(id);
  if (!course) notFound();
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "modules";
  const { cohort, activeCount, requestedCount, addable, nextWeekNumber } = course;
  const here = `/admin/courses/${cohort.id}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>
        <Link href="/admin" style={{ fontWeight: 500 }}>
          Courses
        </Link>{" "}
        / {cohort.name}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading-sm)",
            fontWeight: 800,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          {cohort.name}
        </h1>
        <Badge tone={activeCount > 0 ? "done" : "neutral"}>{activeCount} active</Badge>
        {requestedCount > 0 && (
          <Badge tone="new">
            {requestedCount} request{requestedCount === 1 ? "" : "s"}
          </Badge>
        )}
        {cohort.isListed && <Badge tone="neutral">Listed</Badge>}
      </div>

      <nav
        aria-label="Course sections"
        style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--border-card)", overflowX: "auto" }}
      >
        {TABS.map((t) => (
          <Link
            key={t}
            href={`${here}?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: t === tab ? "var(--action-primary)" : "var(--text-tertiary)",
              padding: "8px 13px",
              borderBottom: `2px solid ${t === tab ? "var(--action-primary)" : "transparent"}`,
              whiteSpace: "nowrap",
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </nav>

      {sp.ok === "saved" && tab === "details" && (
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>Saved.</p>
      )}
      {sp.ok === "week-deleted" && tab === "modules" && (
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>Week deleted.</p>
      )}
      {sp.error && tab === "modules" && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {sp.error === "week-taken"
            ? "This course already has a module for that week number."
            : sp.error === "has-submissions"
              ? "That week has student submissions, so it cannot be deleted."
              : sp.error === "save"
                ? "Check the row: week, title, and a release day (dd/mm/yyyy) are required."
                : "Check the composer: week, title, and a release day (dd/mm/yyyy) are required."}
        </p>
      )}

      {tab === "modules" && (
        <ModulesTab course={course} here={here} carried={sp} nextWeekNumber={nextWeekNumber} />
      )}
      {tab === "students" && <StudentsTab course={course} here={here} addable={addable} />}
      {tab === "progress" && <ProgressTab course={course} />}
      {tab === "details" && <DetailsTab course={course} />}
    </div>
  );
}

type CourseData = NonNullable<Awaited<ReturnType<typeof adminCourse>>>;

function ModulesTab({
  course,
  here,
  carried,
  nextWeekNumber,
}: {
  course: CourseData;
  here: string;
  carried: {
    weekNumber?: string;
    title?: string;
    releaseDay?: string;
    edit?: string;
    confirm?: string;
  };
  nextWeekNumber: number;
}) {
  const { cohort, moduleRows } = course;
  // First unreleased week is "next" (blue ring); later ones are locked.
  const firstFuture = moduleRows.find((r) => !r.released)?.module.id;
  const kindOf = (r: CourseData["moduleRows"][number]) =>
    r.released ? "done" : r.module.id === firstFuture ? "now" : "locked";
  const seg = (i: number) => `${(i / moduleRows.length) * 100}%`;
  const railLine = moduleRows.length
    ? `linear-gradient(${moduleRows
        .map((r, i) => {
          const kind = kindOf(r);
          const colour =
            kind === "done" ? "var(--color-jade)" : kind === "now" ? "var(--color-blue)" : "var(--color-linen)";
          return `${colour} ${seg(i)} ${seg(i + 1)}`;
        })
        .join(", ")})`
    : undefined;
  const railTo = `${here}?tab=modules`;

  return (
    <div>
      {moduleRows.length > 0 && (
        <div className="lmn-rail" style={railLine ? { ["--rail-line" as string]: railLine } : undefined}>
          <style>{railLine ? `.lmn-rail::before{background:var(--rail-line)}` : ""}</style>
          {moduleRows.map((r) => {
            if (carried.edit === r.module.id) return <EditWeekRow key={r.module.id} row={r} back={railTo} />;
            if (carried.confirm === r.module.id) {
              return <DeleteWeekRow key={r.module.id} row={r} back={railTo} />;
            }
            const kind = kindOf(r);
            const label = completenessLabel(r.counts);
            const weekPath = `${here}/weeks/${r.module.id}`;
            return (
              <div key={r.module.id} className={`lmn-rail-row is-${kind}`}>
                <span className="lmn-rail-node">
                  <span className="lmn-rail-disc">
                    {kind === "done" && <Icon name="check" size={13} strokeWidth={3.2} />}
                    {kind === "locked" && <Icon name="lock" size={12} strokeWidth={2.4} />}
                  </span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>
                    <Link href={weekPath} style={{ color: "inherit" }}>
                      {`W${r.module.weekNumber} · ${r.module.title}`}
                    </Link>
                  </h3>
                  <p className="lmn-rail-sub">
                    {label === "Complete" ? (
                      <>
                        Complete
                        {r.released && (
                          <>
                            {" · "}
                            <span className="ok">
                              {r.submitted} of {course.activeCount} submitted
                            </span>
                          </>
                        )}
                      </>
                    ) : label === "Empty" ? (
                      "Empty"
                    ) : (
                      <span style={{ color: "var(--action-cta)", fontWeight: 700 }}>{label}</span>
                    )}
                  </p>
                </div>
                <span className="lmn-rail-when">
                  {r.released
                    ? `Released ${formatDay(r.module.releaseDate)}`
                    : `Releases ${formatDay(r.module.releaseDate)}`}
                </span>
                <Link href={weekPath} className="lmn-rail-go">
                  Open
                </Link>
                <WeekMenu row={r} here={here} weekPath={weekPath} />
              </div>
            );
          })}
        </div>
      )}
      {moduleRows.length === 0 && (
        <p style={{ margin: "0 0 10px", fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
          No modules yet. Week 1 starts the course.
        </p>
      )}

      {/* The inline composer (no cohort dropdown: this course is the cohort). */}
      <form
        action={createModule}
        style={{
          border: "1.5px dashed var(--border-divider)",
          borderRadius: "var(--radius-cards)",
          padding: "13px 15px",
          marginTop: 10,
          display: "flex",
          gap: 9,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <input type="hidden" name="cohortId" value={cohort.id} />
        <b style={{ fontSize: 13.5, color: "var(--text-heading-color)", alignSelf: "center" }}>
          Add week {carried.weekNumber ?? nextWeekNumber}
        </b>
        <input
          className="lmn-input"
          name="weekNumber"
          type="number"
          min={1}
          required
          aria-label="Week number"
          defaultValue={carried.weekNumber ?? nextWeekNumber}
          style={{ width: 76, padding: "8px 11px", fontSize: 13.5 }}
        />
        <input
          className="lmn-input"
          name="title"
          required
          placeholder="Title"
          aria-label="Title"
          defaultValue={carried.title ?? ""}
          style={{ flex: 1, minWidth: 180, padding: "8px 11px", fontSize: 13.5 }}
        />
        <ReleaseDateField initial={carried.releaseDay ?? ""} />
        <Button variant="primary" size="sm" type="submit">
          Create week
        </Button>
        <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", alignSelf: "center" }}>
          Unlocks at 09:00 Athens time
        </span>
      </form>
    </div>
  );
}

/**
 * The per-week menu (SPEC §15.7 #27). A <details> popover, so it works with
 * no JavaScript. The delete entry is not disabled when the week has
 * submissions: it is replaced by the reason, because "why can I not" is the
 * question the tutor actually has.
 */
function WeekMenu({
  row,
  here,
  weekPath,
}: {
  row: CourseData["moduleRows"][number];
  here: string;
  weekPath: string;
}) {
  const week = `W${row.module.weekNumber}`;
  return (
    <details className="lmn-menu">
      <summary aria-label={`${week} menu`}>⋯</summary>
      <div className="lmn-menu-pop">
        <Link href={`${here}?tab=modules&edit=${row.module.id}`}>Edit week</Link>
        <Link href={weekPath}>Open week</Link>
        {row.submitted > 0 ? (
          <span className="is-why">
            {row.submitted} student{row.submitted === 1 ? " has" : "s have"} submitted work to this
            week, so it cannot be deleted.
          </span>
        ) : (
          <Link className="is-danger" href={`${here}?tab=modules&confirm=${row.module.id}`}>
            Delete week
          </Link>
        )}
      </div>
    </details>
  );
}

/** Edit in place: week number, title and the dd/mm/yyyy release day. */
function EditWeekRow({ row, back }: { row: CourseData["moduleRows"][number]; back: string }) {
  return (
    <form action={updateModule} className="lmn-editrow">
      <input type="hidden" name="id" value={row.module.id} />
      <input type="hidden" name="back" value={back} />
      <p
        style={{
          margin: "0 0 9px",
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: "var(--text-heading-color)",
        }}
      >
        Editing W{row.module.weekNumber}
      </p>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label className="lmn-field" style={{ width: 82 }}>
          <span className="lmn-field-label">Week</span>
          <input
            className="lmn-input"
            name="weekNumber"
            type="number"
            min={1}
            required
            defaultValue={row.module.weekNumber}
            style={{ padding: "8px 11px", fontSize: 13.5 }}
          />
        </label>
        <label className="lmn-field" style={{ flex: 1, minWidth: 180 }}>
          <span className="lmn-field-label">Title</span>
          <input
            className="lmn-input"
            name="title"
            required
            defaultValue={row.module.title}
            style={{ padding: "8px 11px", fontSize: 13.5 }}
          />
        </label>
        <ReleaseDateField initial={toDayText(row.module.releaseDate)} />
        <Button variant="primary" size="sm" type="submit">
          Save
        </Button>
        <Link href={back} className="lmn-rail-go" style={{ color: "var(--text-tertiary)" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

/** The inline confirmation: it names what goes, and what is already known. */
function DeleteWeekRow({ row, back }: { row: CourseData["moduleRows"][number]; back: string }) {
  return (
    <form action={deleteModule} className="lmn-confirm">
      <input type="hidden" name="id" value={row.module.id} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)" }}>
          <b style={{ color: "var(--state-alert)" }}>
            Delete W{row.module.weekNumber} · {row.module.title}?
          </b>{" "}
          {row.fileCount > 0
            ? `Its ${row.fileCount} file${row.fileCount === 1 ? "" : "s"} will be removed and students will no longer see it.`
            : "It stores no files, and students will no longer see it."}{" "}
          No one has submitted work to this week.
        </p>
      </div>
      <Button variant="danger" size="sm" type="submit">
        Delete week
      </Button>
      <Link href={back} className="lmn-rail-go" style={{ color: "var(--text-tertiary)" }}>
        Keep
      </Link>
    </form>
  );
}

function StudentsTab({
  course,
  here,
  addable,
}: {
  course: CourseData;
  here: string;
  addable: CourseData["addable"];
}) {
  const back = `${here}?tab=students`;
  const tone = (status: Enrollment["status"]) =>
    status === "active" ? "done" : status === "requested" ? "new" : "locked";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {course.members.map(({ enrollment, student, done }) => (
        <div
          key={enrollment.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            background: "var(--surface-card)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-cards)",
            padding: "11px 14px",
          }}
        >
          <span style={{ flex: 1, minWidth: 160 }}>
            <Link
              href={`/admin/students?open=${student.id}`}
              style={{ fontWeight: 700, fontSize: 14, color: "var(--text-strong)" }}
            >
              {student.name}
            </Link>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--text-tertiary)" }}>
              {student.username}
              {!student.active && " · access paused"}
            </span>
          </span>
          <Badge tone={tone(enrollment.status)}>{enrollment.status}</Badge>
          {(enrollment.status === "active" || enrollment.status === "paused") && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                {done} of {course.releasedCount}
              </span>
              <ProgressBar value={done} total={course.releasedCount || 1} style={{ width: 72 }} />
            </span>
          )}
          {enrollment.status === "requested" ? (
            <span style={{ display: "inline-flex", gap: 6 }}>
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
            </span>
          ) : (
            <form action={setEnrollmentStatus} style={{ display: "inline-flex", gap: 4 }}>
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
      ))}
      {course.members.length === 0 && (
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
          No students in this course yet.
        </p>
      )}

      <form action={addEnrollment} style={{ display: "flex", gap: 6, maxWidth: 420 }}>
        <input type="hidden" name="cohortId" value={course.cohort.id} />
        <input type="hidden" name="back" value={back} />
        <select
          className="lmn-input"
          name="studentId"
          required
          defaultValue=""
          aria-label="Add a student to this course"
          style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)", flex: 1, minWidth: 0 }}
        >
          <option value="" disabled>
            Add a student…
          </option>
          {addable.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" type="submit">
          Add
        </Button>
      </form>
    </div>
  );
}

async function ProgressTab({ course }: { course: CourseData }) {
  const subs = await db.select().from(submissions);
  const moduleIds = new Set(course.moduleRows.map((r) => r.module.id));
  const subByKey = new Map(
    subs.filter((s) => moduleIds.has(s.moduleId)).map((s) => [`${s.studentId}:${s.moduleId}`, s]),
  );
  const inCourse = course.members.filter(
    (m) => m.enrollment.status === "active" || m.enrollment.status === "paused",
  );
  // Server component renders per-request; "now" is stable within the render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-cards)",
        overflow: "hidden",
      }}
    >
      <ProgressMatrix
        modules={course.moduleRows.map((r) => r.module)}
        students={inCourse.map((m) => m.student)}
        membership={new Map(inCourse.map((m) => [m.student.id, m.enrollment.status]))}
        subByKey={subByKey}
        now={now}
      />
    </div>
  );
}

function DetailsTab({ course }: { course: CourseData }) {
  const { cohort } = course;
  return (
    <form
      action={updateCohort}
      style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}
    >
      <input type="hidden" name="id" value={cohort.id} />
      <TextArea
        label="Blurb (what students read in the catalog)"
        name="blurb"
        rows={3}
        defaultValue={cohort.blurb ?? ""}
        placeholder="A couple of sentences: what the course covers, the pace, when it starts."
      />
      <label
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-body-sm)", fontWeight: 500 }}
      >
        <input type="checkbox" name="isListed" defaultChecked={cohort.isListed} />
        Listed in the student catalog (students can ask to join)
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Input label="Subject" name="subject" required defaultValue={cohort.subject} style={{ flex: 1, minWidth: 140 }} />
        <label className="lmn-field" style={{ width: 110 }}>
          <span className="lmn-field-label">Level</span>
          <select className="lmn-input" name="level" defaultValue={cohort.level}>
            <option value="HL">HL</option>
            <option value="SL">SL</option>
          </select>
        </label>
        <Input
          label="Exam year"
          name="examYear"
          type="number"
          required
          defaultValue={cohort.examYear}
          style={{ width: 130 }}
        />
      </div>
      <div>
        <Button variant="primary" size="sm" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}
