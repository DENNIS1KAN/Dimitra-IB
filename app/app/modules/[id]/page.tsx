import { notFound, redirect } from "next/navigation";
import { SubmitPanel } from "@/components/app/submit-sheet";
import { SubmissionToastListener } from "@/components/app/submission-toast";
import { Badge } from "@/components/lumen/core";
import { LessonRow, LockPanel, TopBar } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { isNewRelease } from "@/lib/format";
import { studentModuleDetail } from "@/lib/queries";

// /app/modules/[id] — module detail (DESIGN.md §6). Rule 1 makes foreign or
// unreleased modules 404 even by direct URL; Rule 2 gates the solutions.
export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const detail = await studentModuleDetail(id, user);
  if (!detail) notFound();

  const { module, cohort, materials, hasSubmission, isCurrent } = detail;
  const solutions = materials.filter((m) => m.type === "solutions");
  const lessons = materials.filter((m) => m.type !== "solutions");

  const rowFor = (m: (typeof materials)[number]) => {
    switch (m.type) {
      case "video":
        return (
          <LessonRow
            key={m.id}
            kind="video"
            title={m.title}
            meta="Watch"
            href={`/app/modules/${module.id}/watch/${m.id}`}
          />
        );
      case "slides":
        return (
          <LessonRow
            key={m.id}
            kind="slides"
            title={m.title}
            meta="View inline · stamped download"
            href={`/api/materials/${m.id}`}
          />
        );
      case "exercises":
        return (
          <LessonRow
            key={m.id}
            kind="exercise"
            title={m.title}
            meta="Download"
            href={`/api/materials/${m.id}?download=1`}
          />
        );
      case "solutions":
        return (
          <LessonRow
            key={m.id}
            kind="solutions"
            title={m.title}
            meta="Compare line by line"
            href={`/api/materials/${m.id}`}
          />
        );
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <SubmissionToastListener />
      <TopBar title={`Week ${module.weekNumber}`} backHref="/app" />
      <div style={{ padding: "4px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <h1
          style={{
            margin: "4px 0 2px",
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
            lineHeight: 1.25,
          }}
        >
          {module.title}
        </h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {isNewRelease(module.releaseDate) && isCurrent && <Badge tone="new">New this week</Badge>}
          <Badge tone="neutral">
            {cohort.name}
          </Badge>
          {hasSubmission && (
            <Badge tone="done" icon="check">
              Attempt sent
            </Badge>
          )}
        </div>

        {lessons.map(rowFor)}

        {hasSubmission && solutions.map(rowFor)}

        <div style={{ marginTop: 8 }}>
          {hasSubmission ? (
            <LockPanel
              locked={false}
              title="Solutions unlocked"
              body="Nice work. Compare your working line by line — and bring anything that still feels off to Dimitra."
            />
          ) : (
            <SubmitPanel moduleId={module.id} />
          )}
        </div>
      </div>
    </main>
  );
}
