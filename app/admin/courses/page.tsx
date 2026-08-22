import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, enrollments, type Enrollment } from "@/db/schema";
import { Badge, Button, Card } from "@/components/lumen/core";
import { Input, TextArea } from "@/components/lumen/forms";
import { requireAdmin } from "@/lib/admin";
import { createCohort, updateCohort } from "../actions";

// /admin/courses — each cohort's catalog fields (blurb, listed) and member
// counts, plus cohort creation (SPEC §15.5). Function over beauty (§12).
export default async function AdminCourses({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const allCohorts = await db.select().from(cohorts).orderBy(asc(cohorts.name));
  const allEnrollments = await db.select().from(enrollments);
  const count = (cohortId: string, status: Enrollment["status"]) =>
    allEnrollments.filter((e) => e.cohortId === cohortId && e.status === status).length;

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
        Courses
      </h1>

      {ok && (
        <Card padding="12px" style={{ borderColor: "var(--action-primary)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 500 }}>
            {ok === "cohort" ? "Course created." : "Saved."}
          </p>
        </Card>
      )}
      {error && (
        <Card padding="12px" style={{ borderColor: "#c4320a" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
            A course needs a name and a subject.
          </p>
        </Card>
      )}

      {allCohorts.map((cohort) => (
        <Card key={cohort.id} padding="20px">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-body)", fontWeight: 700, flex: 1 }}>
              {cohort.name}
            </h2>
            <Badge tone="neutral">
              {cohort.subject} {cohort.level} · {cohort.examYear}
            </Badge>
            <Badge tone="done">{count(cohort.id, "active")} active</Badge>
            {count(cohort.id, "paused") > 0 && (
              <Badge tone="locked">{count(cohort.id, "paused")} paused</Badge>
            )}
            {count(cohort.id, "requested") > 0 && (
              <Badge tone="new">{count(cohort.id, "requested")} requested</Badge>
            )}
          </div>
          <form action={updateCohort} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
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
            <div>
              <Button variant="primary" size="sm" type="submit">
                Save
              </Button>
            </div>
          </form>
        </Card>
      ))}

      <Card padding="20px" style={{ maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
          New course
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
          <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
            New courses start unlisted — add a blurb and tick &ldquo;Listed&rdquo; above when it&rsquo;s ready.
          </p>
          <Button variant="dark" size="sm" type="submit">
            Create course
          </Button>
        </form>
      </Card>
    </div>
  );
}
