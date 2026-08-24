import { CalendarView } from "@/components/rts/calendar-view";
import { buildCalendarMonth, type CalendarRelease } from "@/lib/calendar";
import { requireStudent } from "@/lib/student";
import { studentModuleList, type ModuleListEntry } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// /app/schedule (SPEC §15.7 #24): Sessions and Calendar merged. The month
// grid or agenda from lib/calendar.ts, the weekly clinic line, and the
// "Book a 1:1 on Google Meet" button. Read-only; Rule 1 already filtered
// the releases, and a globally paused student never reaches this.
export default async function StudentSchedule({
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
    <main style={{ maxWidth: 1040, margin: "0 auto", width: "100%" }}>
      <div style={{ padding: "16px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--text-strong)",
          }}
        >
          Schedule
        </h1>
        <CalendarView
          cal={cal}
          bookingUrl={settings.bookingUrl}
          bookingLabel="Book a 1:1 on Google Meet"
          clinicNote={settings.clinicText}
          labelCourses={list.activeCohorts.length > 1}
          moduleHref={(id, released) => (released ? `/app/modules/${id}` : null)}
        />
      </div>
    </main>
  );
}
