import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon, ProgressBar } from "@/components/rts/core";
import { BackLink, NoteCard, ResumeCard } from "@/components/rts/learning";
import { getSessionUser } from "@/lib/auth";
import { formatDay, formatUnlock } from "@/lib/format";
import { studentCourseDetail, type CourseWeekRow } from "@/lib/queries";

// /app/courses/[id] (SPEC §15.7 #24, rebuilt per #27): resume first. The
// "Pick up where you left off" card is the top of the page and the view's
// only orange CTA; the latest released week's note and the week rail sit
// below it. Rule 1 404s any course without an ACTIVE enrollment, even by
// direct URL.
export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const detail = await studentCourseDetail(id, user);
  if (!detail) notFound();
  const { cohort, rows, note, resume, completedCount, releasedCount } = detail;

  type Kind = "done" | "now" | "locked";
  const kindOf = (r: CourseWeekRow): Kind =>
    !r.released ? "locked" : r.hasSubmission ? "done" : "now";
  const seg = (i: number) => `${(i / rows.length) * 100}%`;
  const railLine = rows.length
    ? `linear-gradient(${rows
        .map((r, i) => {
          const kind = kindOf(r);
          const colour =
            kind === "done"
              ? "var(--color-jade)"
              : kind === "now"
                ? "var(--color-blue)"
                : "var(--color-linen)";
          return `${colour} ${seg(i)} ${seg(i + 1)}`;
        })
        .join(", ")})`
    : undefined;

  const railRow = (r: CourseWeekRow) => {
    const kind = kindOf(r);
    const node = (
      <span className="lmn-rail-node">
        <span className="lmn-rail-disc">
          {kind === "done" && <Icon name="check" size={13} strokeWidth={3.2} />}
          {kind === "locked" && <Icon name="lock" size={12} strokeWidth={2.4} />}
        </span>
      </span>
    );
    const title = <h3>{`W${r.module.weekNumber} · ${r.module.title}`}</h3>;
    if (kind === "locked") {
      return (
        <article key={r.module.id} className="lmn-rail-row is-locked">
          {node}
          <div style={{ flex: 1, minWidth: 0 }}>{title}</div>
          <span className="lmn-rail-when">{formatUnlock(r.module.releaseDate)}</span>
        </article>
      );
    }
    // The path itself is the progress reading: "step 2 of 5" is the same
    // number the week page prints (lib/steps).
    const plan = r.plan;
    const sub =
      kind === "done" ? (
        <p className="lmn-rail-sub">
          <span className="ok">Done, solutions unlocked</span>
        </p>
      ) : (
        <p className="lmn-rail-sub">
          {plan?.current
            ? `In progress, step ${plan.current.number} of ${plan.steps.length}`
            : "Submit to unlock the solutions"}
        </p>
      );
    return (
      <Link
        key={r.module.id}
        href={`/app/modules/${r.module.id}`}
        className={`lmn-rail-row is-${kind}`}
      >
        {node}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title}
          {sub}
        </div>
        <span className="lmn-rail-go">{kind === "done" ? "Review" : "Open"}</span>
      </Link>
    );
  };

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
      <div style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
        <BackLink href="/app" label="My courses" />
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.4px",
                color: "var(--text-heading-color)",
                flex: 1,
              }}
            >
              {cohort.name}
            </h1>
            {releasedCount > 0 && (
              <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                {completedCount} of {releasedCount} weeks done
              </span>
            )}
          </div>
          {releasedCount > 0 && (
            <ProgressBar
              value={completedCount}
              total={releasedCount}
              style={{ maxWidth: 300, marginTop: 10 }}
            />
          )}
        </div>

        {resume && (
          <ResumeCard
            tag={resume.tag}
            title={resume.title}
            meta={resume.meta}
            cta={resume.cta}
            href={resume.href}
          />
        )}

        {note && <NoteCard note={note.text} date={formatDay(note.date)} />}

        {rows.length > 0 ? (
          <div
            className="lmn-rail"
            style={railLine ? ({ ["--rail-line" as string]: railLine } as React.CSSProperties) : undefined}
          >
            <style>{railLine ? `.lmn-rail::before{background:var(--rail-line)}` : ""}</style>
            {rows.map(railRow)}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
            Your first module lands soon. Dimitra will let you know the moment it unlocks.
          </p>
        )}
      </div>
    </main>
  );
}
