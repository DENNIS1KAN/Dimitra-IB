import { CalendarView } from "@/components/rts/calendar-view";
import { buildCalendarMonth, type CalendarRelease } from "@/lib/calendar";
import { requireStudent } from "@/lib/student";
import { studentModuleList, type ModuleListEntry } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// /app/calendar (SPEC §15.7 #18): release dates across the student's ACTIVE
// courses (Rule 1 already filtered them in studentModuleList), the weekly
// clinic marker, and the booking link. Read-only. A globally paused student
// never reaches this: the /app layout short-circuits to the Rule 3 screen.
export default async function StudentCalendar({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireStudent();
  const { month } = await searchParams;
  const [list, settings] = await Promise.all([studentModuleList(user), getSettings()]);

  const entries = [list.current, ...list.olderReleased, ...list.future].filter(
    (e): e is ModuleListEntry => !!e,
  );
  const releases: CalendarRelease[] = entries.map((e) => ({
    moduleId: e.module.id,
    weekNumber: e.module.weekNumber,
    title: e.module.title,
    courseName: e.cohort.name,
    releaseDate: e.module.releaseDate,
  }));

  const cal = buildCalendarMonth({
    month,
    now: new Date(),
    releases,
    clinic: { day: settings.clinicDay, time: settings.clinicTime, note: settings.clinicText },
  });

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading)",
            lineHeight: 1.2,
          }}
        >
          Calendar
        </h1>
        <CalendarView
          cal={cal}
          bookingUrl={settings.bookingUrl}
          clinicNote={settings.clinicText}
          labelCourses={list.activeCohorts.length > 1}
          moduleHref={(id, released) => (released ? `/app/modules/${id}` : null)}
        />
      </div>
    </main>
  );
}
