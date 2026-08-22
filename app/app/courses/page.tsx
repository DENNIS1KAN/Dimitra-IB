import { Badge, Button, Card, ProgressBar } from "@/components/lumen/core";
import { studentCourses, type CatalogCourse, type MyCourse } from "@/lib/queries";
import { requireStudent } from "@/lib/student";
import { requestToJoin } from "../actions";

// /app/courses — my courses (active / paused) + the catalog of listed
// courses with "Ask to join" (SPEC §15.4). Mobile-first, DESIGN.md recipes.
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await requireStudent();
  const { ok } = await searchParams;
  const { mine, catalog } = await studentCourses(user);

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
  const subline = (c: MyCourse["cohort"]) => `${c.subject} ${c.level} · Class of ${c.examYear}`;

  const myCard = ({ cohort, enrollment, releasedCount, completedCount }: MyCourse) => (
    <Card key={cohort.id} padding="20px">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
        <h3
          style={{
            margin: 0,
            flex: 1,
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
            lineHeight: 1.25,
          }}
        >
          {cohort.name}
        </h3>
        {enrollment.status === "paused" ? (
          <Badge tone="locked" icon="pause">
            Paused
          </Badge>
        ) : (
          <Badge tone="done" icon="check">
            Enrolled
          </Badge>
        )}
      </div>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "var(--text-caption)",
          letterSpacing: "var(--tracking-caption)",
          color: "var(--text-tertiary)",
        }}
      >
        {subline(cohort)}
      </p>
      {enrollment.status === "paused" ? (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-body-sm)",
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          Paused — talk to Dimitra to continue. Your modules and progress are kept safe meanwhile.
        </p>
      ) : (
        <>
          <ProgressBar
            value={completedCount}
            total={releasedCount}
            label={
              releasedCount === 0
                ? "No modules released yet"
                : `${completedCount} of ${releasedCount} modules`
            }
            style={{ marginBottom: 16 }}
          />
          <Button variant="primary" size="sm" href="/app">
            Open modules
          </Button>
        </>
      )}
    </Card>
  );

  const catalogCard = ({ cohort, requested }: CatalogCourse) => (
    <Card key={cohort.id} padding="20px">
      <h3
        style={{
          margin: "0 0 2px",
          fontSize: "var(--text-subheading)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-subheading)",
          lineHeight: 1.3,
        }}
      >
        {cohort.name}
      </h3>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: "var(--text-caption)",
          letterSpacing: "var(--tracking-caption)",
          color: "var(--text-tertiary)",
        }}
      >
        {subline(cohort)}
      </p>
      {cohort.blurb && (
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--text-body-sm)",
            lineHeight: 1.5,
            letterSpacing: "var(--tracking-body-sm)",
            color: "var(--text-secondary)",
          }}
        >
          {cohort.blurb}
        </p>
      )}
      {requested ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" size="sm" disabled>
            Requested
          </Button>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
            Dimitra will confirm your place.
          </span>
        </div>
      ) : (
        <form action={requestToJoin}>
          <input type="hidden" name="cohortId" value={cohort.id} />
          <Button variant="dark" size="sm" type="submit">
            Ask to join
          </Button>
        </form>
      )}
    </Card>
  );

  const banner =
    ok === "requested" ? (
      <Card padding="16px" style={{ borderColor: "var(--action-primary)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
          Request sent — Dimitra will confirm your place.
        </p>
      </Card>
    ) : null;

  const emptyMine = (
    <Card padding="20px">
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
        You&rsquo;re not in a course yet — ask to join one below.
      </p>
    </Card>
  );
  const emptyCatalog = (
    <Card padding="20px">
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
        No other courses are open right now.
      </p>
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
      Courses
    </h1>
  );

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div className="px-5 pb-6 pt-4 lg:px-8 lg:pb-16 lg:pt-10" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {title}
        {banner}
        {sectionLabel("My courses")}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {mine.length > 0 ? mine.map(myCard) : emptyMine}
        </div>
        <div style={{ marginTop: 8 }}>{sectionLabel("Catalog")}</div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {catalog.length > 0 ? catalog.map(catalogCard) : emptyCatalog}
        </div>
      </div>
    </main>
  );
}
