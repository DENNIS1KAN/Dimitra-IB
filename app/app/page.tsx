import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Icon, ProgressBar } from "@/components/lumen/core";
import { ModuleCard, NoteCard } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { firstName, formatDay, formatUnlock, greeting, isNewRelease } from "@/lib/format";
import { materialMeta, studentModuleList, type ModuleListEntry } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// /app — the dashboard, composed per design/lumen-dashboard-mockup.html:
// indigo hero (greeting + progress) → note from Dimitra → "This week"
// feature card with the ONE orange CTA → clinic strip → the term rail →
// footer. One responsive layout. Same data, same rules as before (Rule 1
// decides every row; SPEC §15.4 for course names).
export default async function AppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [list, settings] = await Promise.all([studentModuleList(user), getSettings()]);
  const multi = list.activeCohorts.length > 1;
  const course = (entry: ModuleListEntry) => (multi ? entry.cohort.name : null);
  const meta = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");
  const hero = list.current;
  const pct = list.releasedCount ? Math.round((list.completedCount / list.releasedCount) * 100) : 0;
  const eyebrow = list.activeCohorts.length
    ? list.activeCohorts.map((c) => c.name).join(" · ")
    : "Private IB tutoring";

  // Empty feature copy depends on WHY there is nothing to show.
  const emptyFeature = () => {
    const requested = list.access.enrollments.some((e) => e.status === "requested");
    if (list.activeCohorts.length === 0 && list.pausedCohorts.length > 0) {
      return "Your course is paused — talk to Dimitra to continue. Your progress is safe.";
    }
    if (list.activeCohorts.length === 0 && requested) {
      return "Your request is with Dimitra — your modules appear here once she confirms your place.";
    }
    if (list.activeCohorts.length === 0) {
      return "You're not in a course yet — browse the catalog and ask to join.";
    }
    return "Your first module lands soon — Dimitra will let you know the moment it unlocks.";
  };

  const noteCard = hero?.module.description ? (
    <NoteCard note={hero.module.description} date={formatDay(hero.module.releaseDate)} style={{ marginTop: -52 }} />
  ) : null;

  const feature = hero ? (
    <ModuleCard
      week={meta(course(hero), "This week")}
      isNew={isNewRelease(hero.module.releaseDate)}
      title={`Week ${hero.module.weekNumber} · ${hero.module.title}`}
      meta={materialMeta(hero.materialCounts)}
      cta={hero.complete ? "Review module" : "Start module"}
      href={`/app/modules/${hero.module.id}`}
      style={{ marginTop: noteCard ? 26 : -52 }}
    />
  ) : (
    <Card featured style={{ marginTop: -52 }}>
      <p style={{ margin: 0, fontWeight: 500, color: "var(--text-secondary)" }}>{emptyFeature()}</p>
      {list.activeCohorts.length === 0 && list.pausedCohorts.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <Button variant="primary" href="/app/courses">
            Browse courses
          </Button>
        </div>
      )}
    </Card>
  );

  // The term rail: current week first, then older released (newest first),
  // then locked teasers — the same order the list always had.
  type Kind = "now" | "open" | "done" | "locked";
  const rows: { entry: ModuleListEntry; kind: Kind }[] = [
    ...(hero ? [{ entry: hero, kind: (hero.complete ? "done" : "now") as Kind }] : []),
    ...list.olderReleased.map((entry) => ({ entry, kind: (entry.complete ? "done" : "open") as Kind })),
    ...list.future.map((entry) => ({ entry, kind: "locked" as Kind })),
  ];
  // Rail line: one colour segment per row (jade done · blue in progress · linen locked).
  const seg = (i: number) => `${(i / rows.length) * 100}%`;
  const railLine = rows.length
    ? `linear-gradient(${rows
        .map(({ kind }, i) => {
          const colour = kind === "done" ? "var(--color-jade)" : kind === "locked" ? "var(--color-linen)" : "var(--color-blue)";
          return `${colour} ${seg(i)} ${seg(i + 1)}`;
        })
        .join(", ")})`
    : undefined;

  const railRow = ({ entry, kind }: { entry: ModuleListEntry; kind: Kind }, i: number) => {
    const { module } = entry;
    const node = (
      <span className="lmn-rail-node">
        <span className="lmn-rail-disc">
          {kind === "done" && <Icon name="check" size={13} strokeWidth={3.2} />}
          {kind === "locked" && <Icon name="lock" size={12} strokeWidth={2.4} />}
        </span>
      </span>
    );
    const title = <h3>{`Week ${module.weekNumber} · ${module.title}`}</h3>;
    const cls = `lmn-rail-row is-${kind === "open" ? "now" : kind} lmn-rise`;
    const delay = { animationDelay: `${0.28 + i * 0.05}s` };
    if (kind === "locked") {
      return (
        <article key={module.id} className={cls} style={delay}>
          {node}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title}
            {course(entry) && <p className="lmn-rail-sub">{course(entry)}</p>}
          </div>
          <span className="lmn-rail-when">{formatUnlock(module.releaseDate)}</span>
        </article>
      );
    }
    const sub =
      kind === "done" ? (
        <p className="lmn-rail-sub">
          {course(entry) && `${course(entry)} · `}Completed · <span className="ok">Solutions unlocked</span>
        </p>
      ) : (
        <p className="lmn-rail-sub">
          {meta(course(entry), "In progress · submit your attempt to unlock solutions")}
        </p>
      );
    return (
      <Link key={module.id} href={`/app/modules/${module.id}`} className={cls} style={delay}>
        {node}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title}
          {sub}
        </div>
        <span className="lmn-rail-go">{kind === "done" ? "Review" : "Continue"}</span>
      </Link>
    );
  };

  return (
    <>
      <header className="lmn-hero">
        <div className="lmn-wrap lmn-rise">
          <p className="lmn-eyebrow" style={{ margin: 0 }}>
            {eyebrow}
          </p>
          <h1
            style={{
              margin: "10px 0 22px",
              fontSize: "clamp(28px, 4.4vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
            }}
          >
            {greeting()}, {firstName(user.name)}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: "min(380px, 100%)" }}>
              <ProgressBar value={list.completedCount} total={list.releasedCount || 1} onDark label="Course progress" style={{ display: "contents" }} />
            </div>
            <small style={{ fontSize: 14, color: "rgba(255,255,255,.75)" }}>
              {list.releasedCount > 0
                ? `${list.completedCount} of ${list.releasedCount} modules complete · ${pct}%`
                : "Nothing released yet"}
            </small>
          </div>
        </div>
      </header>

      <main style={{ padding: "0 0 72px" }}>
        <div className="lmn-wrap" style={{ display: "flex", flexDirection: "column" }}>
          {noteCard}
          {feature}

          {settings.clinicText && (
            <Link href="/app/sessions" className="lmn-clinic lmn-rise" style={{ margin: "14px 0 0", animationDelay: ".2s" }}>
              <Icon name="calendar" size={18} />
              <span>
                <b>Next clinic</b> — {settings.clinicText}
              </span>
            </Link>
          )}

          {rows.length > 0 && (
            <>
              <div
                className="lmn-rise"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  margin: "34px 0 16px",
                  animationDelay: ".24s",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-0.3px" }}>
                  Your term, week by week
                </h2>
                <Link href="/app/assignments" style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
                  All assignments
                </Link>
              </div>
              <div className="lmn-rail" style={railLine ? { ["--rail-line" as string]: railLine } : undefined}>
                <style>{railLine ? `.lmn-rail::before{background:var(--rail-line)}` : ""}</style>
                {rows.map(railRow)}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="lmn-footer">
        <div className="lmn-wrap">
          <span>Lumen · IB {list.activeCohorts[0]?.subject ?? "Chemistry"} with Dimitra Anglou</span>
          <span>Access by invitation</span>
        </div>
      </footer>
    </>
  );
}
