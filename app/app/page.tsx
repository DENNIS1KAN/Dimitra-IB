import { redirect } from "next/navigation";
import { Badge, Button, Card, ProgressBar } from "@/components/lumen/core";
import { ListRow, ModuleCard, NoteCard } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { firstName, formatDay, formatDue, formatUnlock, isNewRelease } from "@/lib/format";
import { materialMeta, studentModuleList, type ModuleListEntry } from "@/lib/queries";
import { subjectColor } from "@/lib/subject";

// /app — the merged module list (DESIGN.md §6): greeting → note → hero →
// progress → released weeks → locked teasers. Rule 1 decides every row.
// Phase 2 (SPEC §15.4): rows span every ACTIVE enrollment (named when there
// is more than one), the hero shows its due date, overdue rows are badged.
export default async function AppPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const list = await studentModuleList(user);
  const multi = list.activeCohorts.length > 1;
  const courseLabel = (entry: ModuleListEntry) => (multi ? entry.cohort.name : null);
  const meta = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");
  const hero = list.current;

  const noteCard = hero?.module.description ? (
    <NoteCard note={hero.module.description} date={formatDay(hero.module.releaseDate)} />
  ) : null;

  const progressCard =
    list.releasedCount > 0 ? (
      <ProgressBar
        value={list.completedCount}
        total={list.releasedCount}
        label={`${list.completedCount} of ${list.releasedCount} modules`}
      />
    ) : null;

  // Empty hero copy depends on WHY there is nothing to show.
  const emptyHero = () => {
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

  const heroCard = hero ? (
    <ModuleCard
      week={meta(courseLabel(hero), `Week ${hero.module.weekNumber}`, "This week")}
      isNew={isNewRelease(hero.module.releaseDate)}
      badges={
        hero.overdue ? (
          <Badge tone="alert" icon="schedule">
            Overdue
          </Badge>
        ) : undefined
      }
      title={hero.module.title}
      meta={materialMeta(hero.materialCounts)}
      due={hero.module.dueDate && !hero.complete ? formatDue(hero.module.dueDate) : undefined}
      cta={hero.complete ? "Review module" : "Start module"}
      href={`/app/modules/${hero.module.id}`}
    />
  ) : (
    <Card featured>
      <p style={{ margin: 0, fontWeight: 500, color: "var(--text-secondary)" }}>{emptyHero()}</p>
      {list.activeCohorts.length === 0 && list.pausedCohorts.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" href="/app/courses">
            Browse courses
          </Button>
        </div>
      )}
    </Card>
  );

  const weekRow = (entry: ModuleListEntry) =>
    entry.complete ? (
      <ListRow
        key={entry.module.id}
        icon="check_circle"
        iconColor={subjectColor(entry.cohort.subject)}
        label={`Week ${entry.module.weekNumber} — ${entry.module.title}`}
        meta={meta(courseLabel(entry), "Completed")}
        trailing={
          <Badge tone="done" icon="check">
            Done
          </Badge>
        }
        chevron={false}
        href={`/app/modules/${entry.module.id}`}
      />
    ) : (
      <ListRow
        key={entry.module.id}
        icon="play_circle"
        iconColor={subjectColor(entry.cohort.subject)}
        label={`Week ${entry.module.weekNumber} — ${entry.module.title}`}
        meta={meta(
          courseLabel(entry),
          entry.module.dueDate ? formatDue(entry.module.dueDate) : "Open — attempt not sent yet",
        )}
        trailing={entry.overdue ? <Badge tone="alert">Overdue</Badge> : undefined}
        href={`/app/modules/${entry.module.id}`}
      />
    );

  const teaserRow = (entry: ModuleListEntry) => (
    <ListRow
      key={entry.module.id}
      icon="lock"
      iconColor="var(--state-locked)"
      label={`Week ${entry.module.weekNumber} — ${entry.module.title}`}
      meta={meta(courseLabel(entry), formatUnlock(entry.module.releaseDate))}
      chevron={false}
    />
  );

  const greeting = (
    <h1
      style={{
        margin: 0,
        fontSize: "var(--text-heading)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-heading)",
        lineHeight: 1.2,
      }}
    >
      Hi {firstName(user.name)}.
    </h1>
  );

  return (
    <>
      {/* Mobile (≤ lg): single column, 20px gutters, 390px-first */}
      <main className="lg:hidden" style={{ padding: "8px 20px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ marginTop: 8 }}>{greeting}</div>
          {noteCard}
          {heroCard}
          {progressCard}
          {(list.olderReleased.length > 0 || list.future.length > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.olderReleased.map(weekRow)}
              {list.future.map(teaserRow)}
            </div>
          )}
        </div>
      </main>

      {/* Desktop (lg+): 1040px shell, 1.6fr/1fr grid per DESIGN.md */}
      <main className="hidden lg:block">
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 32px 64px" }}>
          <div style={{ marginBottom: 24 }}>{greeting}</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {heroCard}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.olderReleased.map(weekRow)}
                {list.future.map(teaserRow)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {noteCard}
              {progressCard && (
                <Card padding="20px">
                  <div
                    style={{
                      fontSize: "var(--text-body-sm)",
                      fontWeight: 700,
                      marginBottom: 12,
                    }}
                  >
                    This term
                  </div>
                  {progressCard}
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
