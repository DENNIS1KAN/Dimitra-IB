import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, materials, modules } from "@/db/schema";
import { Badge, Button, Icon } from "@/components/rts/core";
import { Input } from "@/components/rts/forms";
import { NoteAutosave } from "@/components/admin/note-autosave";
import { ReleaseDateField } from "@/components/admin/release-date-field";
import { WeekSlots } from "@/components/admin/week-slots";
import { requireAdmin } from "@/lib/admin";
import { missingTypes, readySummary, type RequiredType } from "@/lib/content";
import { formatDay } from "@/lib/format";
import { toDayText } from "@/lib/tz";
import { isUuid } from "@/lib/validate";
import { updateModule } from "../../../../actions";

// The week editor (SPEC §15.7 #23, design/admin-blend-final.html): four
// labeled slots on the left; the "Ready for Monday?" checklist, the
// autosaving weekly note, week details, and the student preview on the right.
export default async function WeekEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; moduleId: string }>;
  searchParams: Promise<{
    ok?: string;
    error?: string;
    weekNumber?: string;
    title?: string;
    releaseDay?: string;
  }>;
}) {
  await requireAdmin();
  const { id, moduleId } = await params;
  if (!isUuid(id) || !isUuid(moduleId)) notFound();
  const { ok, error, ...carried } = await searchParams;

  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module || module.cohortId !== id) notFound();
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, module.cohortId));
  const mats = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, moduleId))
    .orderBy(asc(materials.sortOrder), asc(materials.id));

  const counts: Record<string, number> = {};
  for (const m of mats) counts[m.type] = (counts[m.type] ?? 0) + 1;
  const missing = missingTypes(counts);
  const summary = readySummary(module.weekNumber, missing);
  // Server component renders per-request; "now" is stable within the render.
  // eslint-disable-next-line react-hooks/purity
  const released = module.releaseDate.getTime() <= Date.now();
  const dayText = toDayText(module.releaseDate);

  const checklist: { label: string; ok: boolean }[] = [
    { label: counts.video ? `Videos · ${counts.video}` : "Videos", ok: !missing.includes("video") },
    { label: "Slides", ok: !missing.includes("slides" as RequiredType) },
    { label: "Exercises", ok: !missing.includes("exercises" as RequiredType) },
    { label: "Solutions", ok: !missing.includes("solutions" as RequiredType) },
    { label: "Release date set", ok: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>
        <Link href="/admin" style={{ fontWeight: 500 }}>
          Courses
        </Link>{" "}
        /{" "}
        <Link href={`/admin/courses/${cohort.id}`} style={{ fontWeight: 500 }}>
          {cohort.name}
        </Link>{" "}
        / Week {module.weekNumber}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading-sm)",
            fontWeight: 800,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          W{module.weekNumber} · {module.title}
        </h1>
        <Badge tone={released ? "done" : "neutral"}>
          {released
            ? `Released ${formatDay(module.releaseDate)}`
            : `Releases ${formatDay(module.releaseDate)}, 09:00`}
        </Badge>
      </div>

      {ok === "saved" && (
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>Saved.</p>
      )}
      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {error === "week-taken"
            ? "This course already has a module for that week number."
            : "Check the fields: week, title, and a release day (dd/mm/yyyy) are required."}
        </p>
      )}

      <div className="rts-cols">
        <WeekSlots
          moduleId={module.id}
          materials={mats.map((m) => ({
            id: m.id,
            type: m.type,
            title: m.title,
            externalUrl: m.externalUrl,
          }))}
        />

        <div>
          <section style={sideSlot} aria-label="Ready for Monday?">
            {sideHeading("Ready for Monday?")}
            {checklist.map((line) => (
              <div
                key={line.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontSize: 13.5,
                  padding: "5px 0",
                  fontWeight: line.ok ? 400 : 700,
                  color: line.ok ? "var(--text-primary)" : "var(--text-strong)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    flex: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    background: line.ok ? "var(--state-done)" : "var(--surface-card)",
                    border: line.ok ? "none" : "2px solid var(--color-linen)",
                  }}
                >
                  {line.ok && <Icon name="check" size={9} strokeWidth={3.6} color="#fff" />}
                </span>
                {line.label}
                <span className="sr-only">{line.ok ? " (done)" : " (missing)"}</span>
              </div>
            ))}
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                background: "var(--surface-page)",
                borderRadius: 9,
                padding: "9px 11px",
                color: "var(--text-primary)",
              }}
            >
              <b style={{ color: "var(--text-strong)" }}>{summary.lead}</b> {summary.rest}
            </p>
          </section>

          <section style={sideSlot} aria-label="Weekly note">
            {sideHeading("Weekly note", "shows on the student course page")}
            <NoteAutosave moduleId={module.id} initial={module.description ?? ""} />
          </section>

          <section style={sideSlot} aria-label="Week details">
            {sideHeading("Week details")}
            <form action={updateModule} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="hidden" name="id" value={module.id} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Input
                  label="Week"
                  name="weekNumber"
                  type="number"
                  min={1}
                  required
                  defaultValue={carried.weekNumber ?? module.weekNumber}
                  style={{ width: 90 }}
                />
                <ReleaseDateField initial={carried.releaseDay ?? dayText} />
              </div>
              <Input label="Title" name="title" required defaultValue={carried.title ?? module.title} />
              <div>
                <Button variant="secondary" size="sm" type="submit">
                  Save details
                </Button>
              </div>
            </form>
          </section>

          <Link
            href={`/admin/preview/modules/${module.id}`}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              marginTop: 9,
              background: "var(--surface-card)",
              color: "var(--action-primary)",
              border: "1.5px solid var(--action-primary)",
              borderRadius: "var(--radius-pills)",
              padding: "9px 14px",
              fontWeight: 700,
              fontSize: 13.5,
              boxSizing: "border-box",
            }}
          >
            Preview as a student
          </Link>
        </div>
      </div>
    </div>
  );
}

const sideSlot: React.CSSProperties = {
  border: "1px solid var(--border-card)",
  borderRadius: "var(--radius-cards)",
  padding: "15px 16px",
  marginBottom: 13,
  background: "var(--surface-card)",
};

function sideHeading(title: string, hint?: string) {
  return (
    <h2
      style={{
        margin: "0 0 10px",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--text-heading-color)",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {title}
      {hint && (
        <small
          style={{
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: 0,
            color: "var(--text-tertiary)",
            fontSize: 12,
          }}
        >
          {hint}
        </small>
      )}
    </h2>
  );
}
