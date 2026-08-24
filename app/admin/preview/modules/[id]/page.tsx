import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, materials, modules } from "@/db/schema";
import { Badge } from "@/components/rts/core";
import { LessonRow, LockPanel } from "@/components/rts/learning";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/validate";

// "Preview as a student" (SPEC §15.7 #23): the student module view rendered
// for the admin, gating untouched. Solutions show LOCKED, exactly what a
// student sees before submitting; material links use the admin read path.
export default async function AdminModulePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [module] = await db.select().from(modules).where(eq(modules.id, id));
  if (!module) notFound();
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, module.cohortId));
  const mats = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, id))
    .orderBy(asc(materials.sortOrder), asc(materials.id));
  const lessons = mats.filter((m) => m.type !== "solutions");
  const solutions = mats.filter((m) => m.type === "solutions");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          border: "1px solid var(--border-card)",
          borderLeft: "3px solid var(--action-primary)",
          borderRadius: "0 12px 12px 0",
          background: "var(--surface-card)",
          padding: "10px 14px",
          fontSize: "var(--text-body-sm)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ flex: 1 }}>
          Previewing week {module.weekNumber} as a student. Solutions show locked, exactly as a
          student sees them before submitting.
        </span>
        <Link
          href={`/admin/courses/${module.cohortId}/weeks/${module.id}`}
          style={{ fontWeight: 700, whiteSpace: "nowrap" }}
        >
          Back to the editor
        </Link>
      </div>

      <p className="lmn-eyebrow" style={{ margin: "8px 0 0", color: "var(--text-tertiary)" }}>
        Week {module.weekNumber}
      </p>
      <h1
        style={{
          margin: "0 0 2px",
          fontSize: "var(--text-heading-sm)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-heading-sm)",
          lineHeight: 1.25,
        }}
      >
        {module.title}
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Badge tone="neutral">{cohort?.name}</Badge>
      </div>

      {lessons.map((m) =>
        m.type === "video" ? (
          <LessonRow key={m.id} kind="video" title={m.title} meta="Watch" href={`/api/materials/${m.id}`} />
        ) : m.type === "slides" ? (
          <LessonRow
            key={m.id}
            kind="slides"
            title={m.title}
            meta="View inline · stamped download"
            href={`/api/materials/${m.id}`}
          />
        ) : (
          <LessonRow
            key={m.id}
            kind="exercise"
            title={m.title}
            meta="Download"
            href={`/api/materials/${m.id}?download=1`}
          />
        ),
      )}
      {solutions.map((m) => (
        <LessonRow key={m.id} kind="solutions" title={m.title} locked />
      ))}
      {mats.length === 0 && (
        <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
          Nothing uploaded yet. Students would see an empty week.
        </p>
      )}

      <div style={{ marginTop: 8 }}>
        <LockPanel
          locked
          title="Solutions locked"
          body="Students unlock the solutions by sending a photo of their attempt. This preview always shows the before state."
        />
      </div>
    </div>
  );
}
