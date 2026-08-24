import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmitPanel } from "@/components/app/submit-sheet";
import { SubmissionToastListener } from "@/components/app/submission-toast";
import { Badge, Icon } from "@/components/rts/core";
import { BackLink, StepRow } from "@/components/rts/learning";
import { getSessionUser } from "@/lib/auth";
import { studentModuleDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import type { Step } from "@/lib/steps";

// /app/modules/[id]: the week as a numbered path (SPEC §15.7 #27). One step
// per video, then Attempt, Submit and Solutions; exactly one step is current
// and only it carries the action. Rule 1 makes foreign or unreleased weeks
// 404 even by direct URL; Rule 2 still gates the solutions.
export default async function WeekPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const detail = await studentModuleDetail(id, user);
  if (!detail) notFound();
  const settings = await getSettings();

  const { module, cohort, materials, hasSubmission, plan } = detail;
  const slides = materials.filter((m) => m.type === "slides");
  const exercises = materials.filter((m) => m.type === "exercises");
  const solutions = materials.filter((m) => m.type === "solutions");

  // The current step's control. Everything else on the page is a link.
  const actionFor = (step: Step) => {
    if (step.state !== "current") return undefined;
    if (step.kind === "submit") return <SubmitPanel moduleId={module.id} variant="inline" />;
    if (!step.href) return undefined;
    return (
      <a className="lmn-btn lmn-btn-cta" href={step.href} style={{ fontSize: 13, padding: "9px 16px" }}>
        {step.kind === "video"
          ? step.resumeSeconds > 0
            ? "Resume"
            : "Watch"
          : "Download"}
        <Icon name="arrow_right" size={14} strokeWidth={2.6} />
      </a>
    );
  };

  // Done steps keep the quiet way back in.
  const linkFor = (step: Step) => {
    if (step.state !== "done" || !step.href) return undefined;
    if (step.kind === "video") {
      // A pasted link has nothing to rewind, so it says what it does.
      const isLink = !!materials.find((m) => m.id === step.key)?.externalUrl;
      return isLink
        ? { label: "Open again", href: step.href }
        : { label: "Rewatch", href: `${step.href}?restart=1` };
    }
    if (step.kind === "attempt") return { label: "Download again", href: step.href };
    if (step.kind === "solutions") return { label: "Open solutions", href: step.href };
    return undefined;
  };

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <SubmissionToastListener />
      <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
        <BackLink href={`/app/courses/${cohort.id}`} label={cohort.name} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-heading-sm)",
              fontWeight: 800,
              letterSpacing: "var(--tracking-heading-sm)",
              color: "var(--text-heading-color)",
              lineHeight: 1.25,
            }}
          >
            {`W${module.weekNumber} · ${module.title}`}
          </h1>
          {plan.current ? (
            <Badge tone="new">
              Step {plan.current.number} of {plan.steps.length}
            </Badge>
          ) : (
            <Badge tone="done" icon="check">
              Week complete
            </Badge>
          )}
        </div>

        <div className="lmn-week">
          <div>
            {plan.steps.map((step) => (
              <StepRow
                key={step.key}
                state={step.state}
                number={step.number}
                title={step.title}
                meta={step.meta}
                action={actionFor(step)}
                link={linkFor(step)}
              />
            ))}
          </div>

          <aside className="lmn-side">
            <h2>Materials</h2>
            {[...slides, ...exercises, ...(hasSubmission ? solutions : [])].map((m) => (
              <a key={m.id} className="lmn-side-card" href={`/api/materials/${m.id}?download=1`}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <h3>{m.title}</h3>
                  <p>
                    {m.type === "slides"
                      ? "Slides"
                      : m.type === "exercises"
                        ? "Exercises"
                        : "Solutions"}
                  </p>
                </span>
                <span className="lmn-step-link">Download</span>
              </a>
            ))}
            {slides.length + exercises.length === 0 && (
              <p style={{ margin: "0 0 9px", fontSize: 12.5, color: "var(--text-tertiary)" }}>
                Nothing to download this week.
              </p>
            )}
            {!hasSubmission && solutions.length > 0 && (
              <p style={{ margin: "0 0 9px", fontSize: 12.5, color: "var(--text-tertiary)" }}>
                The solutions appear here once you submit.
              </p>
            )}

            <h2 style={{ marginTop: 14 }}>Stuck?</h2>
            <Link className="lmn-side-card" href="/app/messages">
              <span style={{ flex: 1, minWidth: 0 }}>
                <h3>Message Dimitra</h3>
                <p>Ask about this week in your thread</p>
              </span>
              <span className="lmn-step-link">Open</span>
            </Link>
            <Link className="lmn-side-card" href="/app/schedule">
              <span style={{ flex: 1, minWidth: 0 }}>
                <h3>{clinicTitle(settings.clinicDay, settings.clinicTime)}</h3>
                <p>{settings.clinicText || "Bring the parts that did not click."}</p>
              </span>
              <span className="lmn-step-link">Schedule</span>
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}

/** "Clinic Thursday 18:00", or the honest fallback when none is set. */
function clinicTitle(day: string, time: string): string {
  if (!day) return "Your schedule";
  const named = day.charAt(0).toUpperCase() + day.slice(1);
  return time ? `Clinic ${named} ${time}` : `Clinic on ${named}`;
}
