import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, modules } from "@/db/schema";
import { CalendarView } from "@/components/lumen/calendar-view";
import { requireAdmin } from "@/lib/admin";
import { buildCalendarMonth, type CalendarRelease } from "@/lib/calendar";
import { getSettings } from "@/lib/settings";

// /admin/calendar (SPEC §15.7 #18): every cohort's release dates, always
// labeled, plus the weekly clinic marker. Entries link to the module editor.
export default async function AdminCalendar({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month } = await searchParams;
  const [rows, settings] = await Promise.all([
    db
      .select({ module: modules, cohortName: cohorts.name })
      .from(modules)
      .innerJoin(cohorts, eq(cohorts.id, modules.cohortId)),
    getSettings(),
  ]);

  const releases: CalendarRelease[] = rows.map(({ module, cohortName }) => ({
    moduleId: module.id,
    weekNumber: module.weekNumber,
    title: module.title,
    courseName: cohortName,
    releaseDate: module.releaseDate,
  }));

  const cal = buildCalendarMonth({
    month,
    now: new Date(),
    releases,
    clinic: { day: settings.clinicDay, time: settings.clinicTime, note: settings.clinicText },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Calendar
      </h1>
      <CalendarView
        cal={cal}
        bookingUrl={settings.bookingUrl}
        clinicNote={settings.clinicText}
        labelCourses
        moduleHref={(id) => `/admin/modules/${id}`}
      />
    </div>
  );
}
