import { notFound, redirect } from "next/navigation";
import { SubmitPanel } from "@/components/app/submit-sheet";
import { SubmissionToastListener } from "@/components/app/submission-toast";
import { Badge, IconButton } from "@/components/rts/core";
import { BackLink, LessonRow, LockPanel } from "@/components/rts/learning";
import { getSessionUser } from "@/lib/auth";
import { isNewRelease } from "@/lib/format";
import { studentModuleDetail } from "@/lib/queries";
import { videoEmbed } from "@/lib/video";

// /app/modules/[id]: module detail (DESIGN.md §6). Rule 1 makes foreign or
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
      case "video": {
        // Uploaded or pasted, a video is one Watch step (per-lesson done
        // states stay parked, DESIGN.md §9 #8). A link we cannot embed says
        // so, so the tab that opens is not a surprise (SPEC §15.7 #25).
        const link = m.externalUrl ? videoEmbed(m.externalUrl) : null;
        return (
          <LessonRow
            key={m.id}
            kind="video"
            title={m.title}
            meta={link && !link.embedUrl ? `Open video on ${link.provider}` : "Watch"}
            href={`/app/modules/${module.id}/watch/${m.id}`}
          />
        );
      }
      case "slides":
        return withDownload(
          m.id,
          <LessonRow
            key={m.id}
            kind="slides"
            title={m.title}
            meta="View inline · stamped download"
            href={`/api/materials/${m.id}`}
            style={{ flex: 1, minWidth: 0 }}
          />,
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
        return withDownload(
          m.id,
          <LessonRow
            key={m.id}
            kind="solutions"
            title={m.title}
            meta="Compare line by line"
            href={`/api/materials/${m.id}`}
            style={{ flex: 1, minWidth: 0 }}
          />,
        );
    }
  };

  // SPEC §7: slides are "inline view + download": the row opens the viewer,
  // the trailing button fetches the stamped copy (SPEC §9).
  const withDownload = (materialId: string, row: React.ReactNode) => (
    <div key={materialId} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
      {row}
      <IconButton
        icon="download"
        variant="outline"
        label="Download stamped copy"
        href={`/api/materials/${materialId}?download=1`}
        style={{ height: "auto", alignSelf: "stretch", width: 52, borderRadius: "var(--radius-cards)" }}
      />
    </div>
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <SubmissionToastListener />
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <BackLink href={`/app/courses/${cohort.id}`} label={cohort.name} />
        <p className="lmn-eyebrow" style={{ margin: "4px 0 0", color: "var(--text-tertiary)" }}>
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
              body="Nice work. Compare your working line by line, and bring anything that still feels off to Dimitra."
              cta={solutions.length > 0 ? "Open solutions" : undefined}
              ctaHref={solutions.length > 0 ? `/api/materials/${solutions[0].id}` : undefined}
            />
          ) : (
            <SubmitPanel moduleId={module.id} />
          )}
        </div>
      </div>
    </main>
  );
}
