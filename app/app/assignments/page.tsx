import { Badge, Card } from "@/components/lumen/core";
import { ListRow } from "@/components/lumen/learning";
import { formatDay } from "@/lib/format";
import { studentAssignments, type Assignment } from "@/lib/queries";
import { requireStudent } from "@/lib/student";
import { subjectColor } from "@/lib/subject";

// /app/assignments: released modules not yet submitted, newest release
// first; completed below (SPEC §15.7 #16).
export default async function AssignmentsPage() {
  const user = await requireStudent();
  const { open, completed } = await studentAssignments(user);
  const courses = new Set([...open, ...completed].map((a) => a.cohort.id));
  const multi = courses.size > 1;
  const meta = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

  const sectionLabel = (text: string) => (
    <h2
      style={{
        margin: 0,
        fontSize: "var(--text-body-sm)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-body-sm)",
      }}
    >
      {text}
    </h2>
  );

  const openRow = (a: Assignment) => (
    <ListRow
      key={a.module.id}
      icon="edit_note"
      iconColor={subjectColor(a.cohort.subject)}
      label={`Week ${a.module.weekNumber}: ${a.module.title}`}
      meta={meta(multi ? a.cohort.name : null, `Released ${formatDay(a.module.releaseDate)}`)}
      href={`/app/modules/${a.module.id}`}
    />
  );

  const doneRow = (a: Assignment) => (
    <ListRow
      key={a.module.id}
      icon="check_circle"
      iconColor={subjectColor(a.cohort.subject)}
      label={`Week ${a.module.weekNumber}: ${a.module.title}`}
      meta={meta(multi ? a.cohort.name : null, a.submittedAt ? `Sent ${formatDay(a.submittedAt)}` : null)}
      trailing={
        <Badge tone="done" icon="check">
          Done
        </Badge>
      }
      chevron={false}
      href={`/app/modules/${a.module.id}`}
    />
  );

  const empty = (text: string) => (
    <Card padding="20px">
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>{text}</p>
    </Card>
  );

  const title = (
    <h1
      style={{
        margin: 0,
        fontSize: "var(--text-heading)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-heading)",
        lineHeight: 1.2,
      }}
    >
      Assignments
    </h1>
  );

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div className="px-5 pb-6 pt-4 lg:px-8 lg:pb-16 lg:pt-10" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {title}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sectionLabel("To do")}
            {open.length > 0 ? open.map(openRow) : empty("Nothing waiting. Enjoy the breather.")}
          </section>
          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sectionLabel("Completed")}
            {completed.length > 0
              ? completed.map(doneRow)
              : empty("Your sent attempts will show up here.")}
          </section>
        </div>
      </div>
    </main>
  );
}
