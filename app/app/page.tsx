import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Card, Icon, ProgressBar } from "@/components/rts/core";
import { getSessionUser } from "@/lib/auth";
import { studentHome, type CatalogCourse, type HomeCourse } from "@/lib/queries";
import { requestToJoin } from "./actions";

// /app, the home, is My courses (SPEC §15.7 #24): one card per enrollment
// with Continue deep-linking into that course's current module, and the
// catalog with Ask to join below. Single-course students pay no extra tap.
export default async function MyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { ok } = await searchParams;
  const { courses, catalog, access } = await studentHome(user);
  const requested = access.enrollments.some((e) => e.status === "requested");

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <div
        style={{
          padding: "18px 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
        }}
      >
        <h1
          style={{
            margin: "0 0 2px",
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--text-strong)",
          }}
        >
          My courses
        </h1>

        {ok === "requested" && (
          <Card padding="16px" style={{ borderColor: "var(--action-primary)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
              Request sent. Dimitra will confirm your place.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {courses.map((c) => (
            <CourseCard key={c.cohort.id} c={c} />
          ))}
          {courses.length === 0 && (
            <Card padding="20px">
              <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
                {requested
                  ? "Your request is with Dimitra. Your course appears here once she confirms your place."
                  : "You're not in a course yet. Ask to join one below."}
              </p>
            </Card>
          )}
        </div>

        {catalog.length > 0 && (
          <>
            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "var(--text-body-sm)",
                fontWeight: 700,
                letterSpacing: "var(--tracking-body-sm)",
              }}
            >
              Catalog
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {catalog.map((c) => (
                <CatalogCard key={c.cohort.id} c={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function CourseCard({ c }: { c: HomeCourse }) {
  return (
    <Card padding="17px" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <h3
          style={{
            margin: 0,
            flex: 1,
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "-0.3px",
            color: "var(--text-heading-color)",
            lineHeight: 1.3,
          }}
        >
          {c.cohort.name}
        </h3>
        {c.paused && (
          <Badge tone="locked" icon="pause">
            Paused
          </Badge>
        )}
      </div>

      {c.paused ? (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: "var(--text-body-sm)",
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          Paused. Talk to Dimitra to continue. Your modules and progress are kept safe meanwhile.
        </p>
      ) : (
        <>
          <ProgressBar
            value={c.completedCount}
            total={c.totalModules || 1}
            style={{ margin: "10px 0 6px" }}
          />
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>
            {c.currentWeekNumber ? (
              <>
                Week {c.currentWeekNumber} of {c.lastWeekNumber} ·{" "}
                <b style={{ color: "var(--text-success)", fontWeight: 700 }}>
                  {c.completedCount} complete
                </b>
                {c.newThisWeek && <> · new this week: {c.newThisWeek}</>}
              </>
            ) : (
              <>No modules released yet. Dimitra will let you know when week 1 lands.</>
            )}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {c.continueModuleId && (
              // The one orange CTA on this view belongs to the overall
              // current course; the other cards' Continue is primary blue
              // (flagged conflict, SPEC §15.7 #24).
              <Button
                variant={c.hero ? "cta" : "primary"}
                size="sm"
                href={`/app/modules/${c.continueModuleId}`}
              >
                Continue
                <Icon name="arrow_right" size={16} strokeWidth={2.6} />
              </Button>
            )}
            <Link
              href={`/app/courses/${c.cohort.id}`}
              style={{ fontWeight: 700, fontSize: 13.5 }}
            >
              Open course
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

function CatalogCard({ c }: { c: CatalogCourse }) {
  const { cohort, requested } = c;
  return (
    <Card padding="17px">
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
        {cohort.subject} {cohort.level} · Class of {cohort.examYear}
      </p>
      {cohort.blurb && (
        <p
          style={{
            margin: "0 0 14px",
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
}
