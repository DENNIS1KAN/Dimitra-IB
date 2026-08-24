import Link from "next/link";
import { Button } from "@/components/rts/core";
import { Input } from "@/components/rts/forms";
import { requireAdmin } from "@/lib/admin";
import { createCohort } from "../../actions";

// /admin/courses/new (SPEC §15.7 #23): the create form on its own page,
// reached from the dashed New course card. Creating opens the new course.
export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>
        <Link href="/admin" style={{ fontWeight: 500 }}>
          Courses
        </Link>{" "}
        / New course
      </p>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        New course
      </h1>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          A course needs a name and a subject.
        </p>
      )}

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
          New courses start unlisted. Add a blurb and tick Listed in the course Details tab when
          it is ready.
        </p>
        <Button variant="dark" size="sm" type="submit">
          Create course
        </Button>
      </form>
    </div>
  );
}
