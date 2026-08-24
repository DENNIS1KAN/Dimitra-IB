import Link from "next/link";
import { Button, Card, Icon, IconButton } from "@/components/lumen/core";
import { ListRow } from "@/components/lumen/learning";
import type { CalendarEntry, CalendarMonth } from "@/lib/calendar";

// Shared read-only calendar (SPEC §15.7 #18), one responsive layout: the
// month grid from 641px, the agenda list below that (390px first). Server
// component; month navigation is plain links, no client state.

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pillText(entry: CalendarEntry): string {
  if (entry.kind === "clinic") return entry.time ? `${entry.time} Clinic` : "Clinic";
  return `${entry.time} W${entry.weekNumber} ${entry.title}`;
}

export function CalendarView({
  cal,
  bookingUrl,
  clinicNote,
  labelCourses,
  moduleHref,
}: {
  cal: CalendarMonth;
  bookingUrl: string;
  /** settings.clinic_text, shown once above the month as the optional note. */
  clinicNote: string;
  /** Show the course name on release entries (admin always, students when multi). */
  labelCourses: boolean;
  /** Where a release entry links to; null = plain text (e.g. unreleased for students). */
  moduleHref: (moduleId: string, released: boolean) => string | null;
}) {
  const pill = (entry: CalendarEntry, key: number) => {
    if (entry.kind === "clinic") {
      return (
        <span key={key} className="lmn-cal-pill is-clinic" title={entry.note || "Weekly clinic"}>
          {pillText(entry)}
        </span>
      );
    }
    const cls = `lmn-cal-pill ${entry.released ? "is-release" : "is-future"}`;
    const label = (
      <>
        {pillText(entry)}
        {labelCourses && <span className="lmn-cal-course">{entry.courseName}</span>}
      </>
    );
    const href = moduleHref(entry.moduleId, entry.released);
    if (href) {
      return (
        <Link key={key} href={href} className={cls} title={`Week ${entry.weekNumber}: ${entry.title}`}>
          {label}
        </Link>
      );
    }
    return (
      <span key={key} className={cls} title={`Week ${entry.weekNumber}: ${entry.title}`}>
        {label}
      </span>
    );
  };

  const agendaRow = (entry: CalendarEntry, key: number) => {
    if (entry.kind === "clinic") {
      return (
        <ListRow
          key={key}
          icon="calendar"
          iconColor="var(--color-orange)"
          label="Weekly clinic"
          meta={[entry.time || null, entry.note || null].filter(Boolean).join(" · ") || "Time to be confirmed"}
          chevron={false}
        />
      );
    }
    const href = moduleHref(entry.moduleId, entry.released);
    return (
      <ListRow
        key={key}
        icon={entry.released ? "play_circle" : "schedule"}
        iconColor={entry.released ? "var(--action-primary)" : "var(--state-locked)"}
        label={`Week ${entry.weekNumber}: ${entry.title}`}
        meta={[
          labelCourses ? entry.courseName : null,
          `${entry.released ? "Released" : "Releases"} at ${entry.time}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        chevron={!!href}
        href={href ?? undefined}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="lmn-cal-bar">
        <IconButton icon="arrow_back" variant="outline" size="sm" label="Previous month" href={`?month=${cal.prev}`} />
        <h2 style={{ margin: 0, fontSize: "var(--text-subheading)", fontWeight: 800, letterSpacing: "var(--tracking-subheading)" }}>
          {cal.title}
        </h2>
        <IconButton icon="arrow_right" variant="outline" size="sm" label="Next month" href={`?month=${cal.next}`} />
        <span style={{ flex: 1 }} />
        {bookingUrl && (
          <Button variant="primary" size="sm" href={bookingUrl} external>
            Book a 1:1
          </Button>
        )}
      </div>

      {clinicNote && (
        <div className="lmn-clinic">
          <Icon name="calendar" size={18} />
          <span>
            <b>Clinic note</b>: {clinicNote}
          </span>
        </div>
      )}

      <div className="lmn-cal-grid" role="grid" aria-label={cal.title}>
        {DOW.map((d) => (
          <span key={d} className="lmn-cal-dow">
            {d}
          </span>
        ))}
        {cal.weeks.flat().map((day) => (
          <div
            key={day.iso}
            className={`lmn-cal-day${day.inMonth ? "" : " is-out"}${day.today ? " is-today" : ""}`}
          >
            <span className="lmn-cal-num">{day.day}</span>
            {day.entries.map(pill)}
          </div>
        ))}
      </div>

      <div className="lmn-cal-agenda">
        {cal.agenda.map((a) => (
          <section key={a.iso} aria-label={a.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: "var(--text-caption)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".03em",
                color: "var(--text-tertiary)",
              }}
            >
              {a.label}
            </h3>
            {a.entries.map(agendaRow)}
          </section>
        ))}
        {cal.agenda.length === 0 && (
          <Card padding="20px">
            <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
              Nothing on the calendar this month.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
