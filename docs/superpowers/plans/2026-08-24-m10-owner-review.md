# M10 — Owner-Directed Changes After First Hands-On Review

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the owner's eight review decisions: palette audit + hero pill fix, initials-only nav, dd/mm/yyyy release entry at a fixed 09:00 Athens, full deadline removal, admin progress-at-a-glance, a read-only calendar for both roles, an em/en-dash purge, and a parking-lot entry.

**Architecture:** Same boring monolith. One migration (drop `modules.due_date`). Business-logic edits stay in `lib/` pure modules with tests (`gating`, `current`, `queries`, `tz`, `settings-rules`, new `calendar`). UI edits follow DESIGN.md recipes; DESIGN.md itself is updated where the owner's decisions change the skin.

**Tech Stack:** Next.js 16.3.2 App Router, TypeScript strict, Drizzle + PGlite (dev), Tailwind v4 + `.lmn-*` recipe classes, vitest, playwright-core + local Chrome for walks.

**Spec:** `SPEC.md` §15 (amended by Task 1); `DESIGN.md` for all visuals. Owner's M10 directive is recorded in §15.7 #13–#19 and §13.

## Global Constraints

- Repo to work in: `/Users/dim/Dimitra-IB` (the Desktop copy is iCloud-evicted; shell cwd resets, so `cd` in every Bash call).
- SPEC.md authoritative for scope, DESIGN.md for visuals; conflicts get flagged in §15.7 / DESIGN §9, never silently resolved.
- **UI copy: no em (—) or en (–) dashes anywhere in app/ or components/.** New copy in every task must comply; Task 10 sweeps the backlog. Repo docs exempt.
- Owner palette: `#0061EF` blue (nav, primary buttons, links, selected) · `#3B197F` indigo (headings, hero) · `#F47D31` orange (single motivational CTA per view, ink text on it) · `#00A86B` jade (done/progress fills) with `#1e7a4a` Forest when green is text · `#F9F4F2` page · `#FFFFFF` cards. Text ink `#131211` / graphite `#2d2c2b` (recorded deviation, owner-approved). Neutrals stone `#63605d` + linen `#e2ded9` for muted text/borders (owner uses these names in item 5). Error red `#c4320a` stays the sole functional exception. Tints render as alpha of palette hexes, never standalone hexes.
- Release time is always 09:00 Europe/Athens (`lib/tz.ts` `APP_TIMEZONE`).
- Mobile-first: every student screen checked at 390px before desktop.
- Small commits; tests + typecheck + lint + build green before the milestone is declared done; then push to `origin claude/lumen-platform-orient-tc7fma`.
- Embedded PGlite is single-process: stop `next dev` before `db:migrate`/`db:seed`.

**Known root cause carried into Task 11 (palette):** `app/globals.css` defines `--text-display` and `--text-heading` twice in `:root` (color tokens in the palette block, font sizes in the later typography block). The size wins, so every `color: var(--text-display|--text-heading)` is invalid and inherits. On the landing hero (`.lmn-hero{color:#fff}`) the secondary "Student sign in" pill therefore renders white-on-white, and h1–h4 render graphite instead of indigo everywhere. Fix: delete the two color definitions, add `--text-strong: var(--color-ink)` and `--text-heading-color: var(--color-indigo)`, and update every color usage.

---

### Task 1: SPEC.md — record every decision before building

**Files:**
- Modify: `SPEC.md` (§13, §15.1–§15.4 annotations, §15.6 M10 block, §15.7 new rows)

**Steps:**

- [ ] **Step 1: §15.7 — append decision rows** (table gains #13–#19, all "**APPROVED (owner, 2026-08-24)**" / "Owner decision (2026-08-24)"):
  - #13 Palette audit: rendered colors limited to the owner's six brand hexes + Forest text; ink/graphite text deviation reaffirmed; stone/linen approved as the muted/border neutrals; tints must be alpha of palette hexes; error red `#c4320a` stays the sole functional exception; hero becomes solid indigo (indigo-soft gradient companion removed); subject colours reduce to blue (chemistry) and indigo (everything else). Landing hero sign-in pill: white with indigo text. Root cause noted: the `--text-display`/`--text-heading` color-vs-size token collision made the pill inherit white and headings inherit graphite.
  - #14 Nav identity: initials chip only, no name text, student and admin headers (admin header gains the chip it never had).
  - #15 New-module form: release entered as dd/mm/yyyy text, required with a friendly inline message (no native picker, no browser popup); release time fixed at 09:00 Europe/Athens; due-date input removed. Editing an older module re-pins its release time to 09:00 on save.
  - #16 Deadlines removed entirely (owner reversal of §15.1 soft deadlines and of #8/#9 due-date defaults/tie-breaks): migration drops `modules.due_date`; `isOverdue`, badges and due labels deleted; `/app/assignments` = released-not-yet-submitted; hero tie-break = release desc, then course title A-Z, then higher week number. Open-assignments order: same recency rule (stated assumption, newest release first).
  - #17 Admin progress: per-course "submitted x of y released" + small jade bar on the students table; matrix cells jade submitted / linen released-pending / stone unreleased, row + column totals, sticky header row and student column; actions column stacks vertically so "Set password" never truncates.
  - #18 Calendar, both roles, read-only: `/app/calendar` + `/admin/calendar` in the navs; entries = module release dates (student: active courses, labeled when multi; admin: all cohorts, always labeled) + weekly clinic marker from new settings `clinic_day` + `clinic_time` (`clinic_text` stays an optional note) + "Book a 1:1" button from `booking_url`. Month grid ≥641px, agenda list at 390px. Google-booked individual 1:1s out of scope.
  - #19 UI copy style rule: no em or en dashes in app/ and components/; sentences restructured with commas/colons/periods, not hyphen swaps.
- [ ] **Step 2: annotate the superseded text** with *Amended (M10, §15.7 #16)* pointers: §15.1 "Deadlines are SOFT" bullet; §15.2 "Soft deadline" paragraph; §15.3 `modules += due_date` bullet; §15.4 due/overdue mentions in `/app` and `/app/assignments`; §15.7 #8 and #9 rows get "superseded by #16" notes; §6 modules Phase-2 note. §15.3 settings bullet gains `clinic_day`, `clinic_time` (#18). §15.5 Modules "due_date field" line annotated.
- [ ] **Step 3: §15.6 — add the M10 block** (unticked checklist, ticked only after the Task 12 walk): palette walk clean at every route; initials-only navs; dd/mm/yyyy release form with inline message; no due-date remnants (grep + UI); students table figures + matrix states/totals/sticky + actions fix; calendar walked both roles at 390/1280; dash grep of app/ + components/ returns zero; tests/typecheck/lint/build green.
- [ ] **Step 4: §13 parking lot** — add "per-module MCQ self-check (5 questions, auto-marked, jade feedback) *(Phase 3 candidate, decision after the pilot)*".
- [ ] **Step 5: Commit** `spec: record M10 owner decisions (§15.7 #13-#19, §13 MCQ parking lot)` together with this plan file: `git add SPEC.md docs/superpowers/plans/2026-08-24-m10-owner-review.md && git commit`.

### Task 2: Deadline removal — schema, gating, current, queries (+ tests first)

**Files:**
- Modify: `db/schema.ts` (drop `dueDate`), `lib/gating.ts`, `lib/gating.test.ts`, `lib/current.ts`, `lib/current.test.ts`, `lib/queries.ts`, `lib/queries.test.ts`, `lib/tz.ts`, `lib/tz.test.ts`, `lib/format.ts`, `db/seed-data.ts`
- Create: `db/migrations/0006_*.sql` via `npm run db:generate`

**Interfaces (produced for later tasks):**
- `compareByRecency(a, b)` on `Releasable = { id; weekNumber; releaseDate; courseTitle }` (no `dueDate`): release desc → `courseTitle.localeCompare` → week desc.
- `ModuleListEntry`, `StudentModuleDetail`, `Assignment` lose `overdue`; `Assignment` loses due ordering — `open` sorted by `compareByRecency`.
- `lib/format.ts` loses `formatDue`; `lib/tz.ts` loses `defaultDueLocal`/`defaultDueDate`.

**Steps:**

- [ ] **Step 1: update tests to the post-deadline world** (they must fail against current code):
  - `lib/gating.test.ts`: delete the "soft deadline" describe and the `isOverdue` import.
  - `lib/current.test.ts`: drop `due` from the `mod` helper and delete the two due-tie-break cases; the "same release" case now resolves by course title, "same course same release" by higher week. Keep determinism + null cases.
  - `lib/queries.test.ts`: remove `dueDate` from seeded modules; drop overdue assertions; hero tie-break test comment/name now "course title A-Z" (eleni's current stays "W6": HL sorts before SL); `studentAssignments` open order becomes `["W6", "SL W6", "W5"]` for eleni (release desc, then title), `["W6"]` for nikos.
  - `lib/tz.test.ts`: delete the "default due date" describe (keep `mostRecentMondayAt`, `parseLocalInTz` coverage).
- [ ] **Step 2: run** `npx vitest run lib/gating.test.ts lib/current.test.ts lib/tz.test.ts lib/queries.test.ts` — expect failures (type errors / missing behavior), confirming the tests bite.
- [ ] **Step 3: implement**:
  - `db/schema.ts`: delete the `dueDate` column (and its comment).
  - `lib/gating.ts`: delete `isOverdue` and the soft-deadline doc lines.
  - `lib/current.ts`: delete `dueMs` + `dueDate` from `Releasable`; comparator per Interfaces above; refresh the header comment (§15.7 #16).
  - `lib/queries.ts`: remove `overdue` from the three types and every construction site; `studentAssignments` drops `dueOrder` and sorts `open` with `compareByRecency` (completed stays latest-submission-first); remove the `isOverdue` import.
  - `lib/tz.ts`: delete `defaultDueLocal` + `defaultDueDate`.
  - `lib/format.ts`: delete `formatDue`.
  - `db/seed-data.ts`: remove `defaultDueDate` import + `dueDate` values; rewrite the "already overdue" comments and eleni's console line ("week 5 not submitted yet").
- [ ] **Step 4: generate the migration**: `cd /Users/dim/Dimitra-IB && npm run db:generate` → expect a new `db/migrations/0006_*.sql` containing exactly `ALTER TABLE "modules" DROP COLUMN "due_date";`. Inspect it.
- [ ] **Step 5:** `npx vitest run lib/` — the four suites pass (UI still broken; that's Task 3).
- [ ] **Step 6: Commit** `m10: drop due dates from schema and rules; recency tie-break by course title then week`.

### Task 3: Deadline removal — UI sweep

**Files:**
- Modify: `app/app/page.tsx`, `app/app/assignments/page.tsx`, `app/app/modules/[id]/page.tsx`, `components/lumen/learning.tsx`, `app/admin/modules/page.tsx`, `app/admin/modules/[id]/page.tsx`, `app/admin/actions.ts`
- Delete: `components/admin/release-due-fields.tsx` (Task 4 creates its replacement; this task temporarily inlines a plain release `datetime-local` Input in both admin forms so the app compiles: `<Input label="Release date & time" name="releaseDate" type="datetime-local" required defaultValue={...} />` with the existing `parseLocalInTz` server path kept as-is)
- Modify: `components/lumen/core.tsx` (delete the now-unused `alert` badge tone)

**Steps:**

- [ ] **Step 1:** `app/app/page.tsx`: remove the hero `badges` overdue block, the `due` prop, `formatDue` import, and the rail row `entry.overdue` badge; the in-progress rail sub becomes `meta(course(entry), "In progress, submit your attempt to unlock solutions")` (dash-free).
- [ ] **Step 2:** `app/app/assignments/page.tsx`: `openRow` meta = `meta(multi ? a.cohort.name : null, "Released " + formatDay(a.module.releaseDate))`, no trailing badge; labels use "Week N: title" (colon, not the em dash); empty copy: "Nothing waiting. Enjoy the breather." / "Your sent attempts will show up here."; header comment updated to "released modules not yet submitted".
- [ ] **Step 3:** `app/app/modules/[id]/page.tsx`: delete the Overdue badge and the soft-deadline caption paragraph (with its em dash), the `formatDue` import and `overdue` destructure.
- [ ] **Step 4:** `components/lumen/learning.tsx`: `ModuleCard` loses the `due` prop and its `<p>`; meta margin no longer branches. Keep `badges` (New still uses the slot on the detail page? No: `isNew` is its own prop; the slot's only user was Overdue) — delete the `badges` prop too.
- [ ] **Step 5:** admin: `app/admin/modules/page.tsx` drop the due Badge + `dueDate` searchParam; `[id]/page.tsx` drop `dueLocal` + due carry; `app/admin/actions.ts` `createModule`/`updateModule` drop `dueRaw`/`dueDate` parsing, values, and carry params.
- [ ] **Step 6:** `components/lumen/core.tsx`: remove the `alert` badge tone (last user was Overdue; form errors use inline `#c4320a` text, not badges). Grep `tone="alert"` to confirm zero.
- [ ] **Step 7:** `grep -rn 'due_date\|dueDate\|isOverdue\|overdue\|Overdue\|formatDue' app components lib db --include='*.ts' --include='*.tsx'` → only `db/migrations/0006*.sql` (the DROP) may match.
- [ ] **Step 8:** stop any dev server (`pgrep -fl "next dev"`), `npm run db:migrate && npm run db:seed`; `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 9: Commit** `m10: deadlines removed from every screen; assignments = released not yet submitted`.

### Task 4: New-module form — dd/mm/yyyy at 09:00 Athens

**Files:**
- Modify: `lib/tz.ts`, `lib/tz.test.ts`, `app/admin/actions.ts`, `app/admin/modules/page.tsx`, `app/admin/modules/[id]/page.tsx`
- Create: `components/admin/release-date-field.tsx`

**Interfaces:**
- `lib/tz.ts` produces: `RELEASE_TIME = "09:00"`; `parseDdMmYyyy(value: string): string | null` (returns `"yyyy-mm-dd"`, `null` for malformed or impossible dates); `releaseInstantFromDayText(value: string, timeZone?): Date` (NaN-Date when invalid); `toDayText(date: Date, timeZone?): string` (dd/mm/yyyy in tz). `parseDdMmYyyy` is pure and client-safe (the field component imports it).

**Steps:**

- [ ] **Step 1: failing tests** in `lib/tz.test.ts`:
  ```ts
  describe("release day entry, dd/mm/yyyy at 09:00 Athens (SPEC §15.7 #15)", () => {
    it("parses a valid day", () => expect(parseDdMmYyyy("07/09/2026")).toBe("2026-09-07"));
    it("trims whitespace", () => expect(parseDdMmYyyy(" 07/09/2026 ")).toBe("2026-09-07"));
    it("rejects malformed and impossible entries", () => {
      for (const bad of ["", "7/9/2026", "2026-09-07", "31/02/2026", "00/10/2026", "12/13/2026", "07/09/26"])
        expect(parseDdMmYyyy(bad)).toBeNull();
    });
    it("summer release lands at 06:00 UTC (Athens is UTC+3)", () =>
      expect(releaseInstantFromDayText("24/08/2026").toISOString()).toBe("2026-08-24T06:00:00.000Z"));
    it("winter release lands at 07:00 UTC (Athens is UTC+2)", () =>
      expect(releaseInstantFromDayText("18/01/2027").toISOString()).toBe("2027-01-18T07:00:00.000Z"));
    it("invalid text yields an invalid Date", () =>
      expect(Number.isNaN(releaseInstantFromDayText("31/02/2026").getTime())).toBe(true));
    it("round-trips an instant back to dd/mm/yyyy in Athens", () =>
      expect(toDayText(new Date("2026-08-23T22:30:00Z"))).toBe("24/08/2026"));
  });
  ```
- [ ] **Step 2:** run → fails (functions missing). **Implement** in `lib/tz.ts`:
  ```ts
  export const RELEASE_TIME = "09:00";
  export function parseDdMmYyyy(value: string): string | null {
    const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m.map(Number);
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  export function releaseInstantFromDayText(value: string, timeZone: string = APP_TIMEZONE): Date {
    const iso = parseDdMmYyyy(value);
    return iso ? parseLocalInTz(`${iso}T${RELEASE_TIME}`, timeZone) : new Date(NaN);
  }
  export function toDayText(date: Date, timeZone: string = APP_TIMEZONE): string {
    const w = wallParts(date, timeZone);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(w.d)}/${pad(w.mo)}/${w.y}`;
  }
  ```
  Run → passes.
- [ ] **Step 3: field component** `components/admin/release-date-field.tsx` (client): controlled `<input name="releaseDay">` with `required`, `pattern="\d{2}/\d{2}/\d{4}"`, `inputMode="numeric"`, placeholder "07/09/2026"; `onChange` sets `setCustomValidity(parseDdMmYyyy(v) ? "" : "invalid")`; `onInvalid` calls `e.preventDefault()` (kills the browser popup) and sets an inline message: empty → "Please add the release day, like 07/09/2026.", otherwise "That date does not look right. Please use day/month/year, like 07/09/2026."; message renders in `.lmn-field-help` with `role="alert"` and the `.lmn-field-error` wrapper class; helper when valid: "Modules unlock at 09:00 Athens time on this day."
- [ ] **Step 4: wire it**: both admin module forms replace the temporary datetime-local Input with `<ReleaseDateField initial={...} />` (`carried.releaseDay ?? ""` on create, `carried.releaseDay ?? toDayText(module.releaseDate)` on edit); delete `components/admin/release-due-fields.tsx`; searchParams types use `releaseDay`. `app/admin/actions.ts`: `const releaseDate = releaseInstantFromDayText(String(formData.get("releaseDay") ?? ""))`, week-taken carry uses `releaseDay`; error copy "Module needs a cohort, week number, title, and a release day (dd/mm/yyyy)."
- [ ] **Step 5:** `npm test && npm run typecheck && npm run lint`. **Commit** `m10: release day as dd/mm/yyyy text at a fixed 09:00 Athens; due field gone`.

### Task 5: Nav identity — initials chip only

**Files:**
- Modify: `app/app/layout.tsx`, `app/admin/layout.tsx`, `app/globals.css`

**Steps:**

- [ ] **Step 1:** student layout: delete `<span className="lmn-nav-name">…</span>` and the `firstName` import (keep `initials`); the `lmn-nav-who` span keeps only the Avatar.
- [ ] **Step 2:** admin layout: add `<span className="lmn-nav-who"><Avatar size="sm" tone="inverse" initials={initials(user.name)} /></span>` before the sign-out form; import `Avatar` + `initials`.
- [ ] **Step 3:** `app/globals.css`: delete `.lmn-nav-name` rules (base + the `@media (max-width:1023px)` hide).
- [ ] **Step 4:** `npm run typecheck && npm run lint`. **Commit** `m10: nav identity is the initials chip alone, student and admin`.

### Task 6: Admin students table — per-course completion + actions fix

**Files:**
- Modify: `app/admin/page.tsx`

**Steps:**

- [ ] **Step 1:** load released modules + submissions once: `modules` where `releaseDate <= now`, all `submissions`; build `releasedByCohort: Map<cohortId, moduleIds[]>` and `subSet: Set<"student:module">`.
- [ ] **Step 2:** in each enrollment row (status active or paused), under the name+badge line render `{done} of {released}` in caption stone plus `<ProgressBar value={done} total={released || 1} style={{ width: 72 }} />` (jade fill is built in). Requested/ended rows get no figure.
- [ ] **Step 3:** actions cell: remove `whiteSpace: "nowrap"`; the wrapper becomes `flexDirection: "column", alignItems: "flex-start", gap: 8` so Pause/Unpause stacks above the Set-password form and nothing truncates at any width.
- [ ] **Step 4:** eyeball at 390 and 1280 in the Task 12 walk; `npm run typecheck && npm run lint`. **Commit** `m10: students table shows submitted x of y per course; actions stack instead of truncating`.

### Task 7: Progress matrix — states, totals, sticky headers

**Files:**
- Modify: `app/admin/progress/page.tsx`

**Steps:**

- [ ] **Step 1:** columns become ALL cohort modules (drop the `lte` filter; keep week asc); compute `released = m.releaseDate <= now` per column.
- [ ] **Step 2:** cell rendering by state: submitted → `background: var(--color-jade)`, white check + `formatDay` link (white text, white underline) to `/admin/submissions/[id]`; released-pending → `background: var(--color-linen)` empty; unreleased → `background: var(--color-stone)` empty with `aria-label="unreleased"` on the column header instead. Unreleased header text stays stone with a "releases {formatDay}" sub-line.
- [ ] **Step 3:** totals: trailing "Done" column per row = `x of y` (y = released count); bottom totals row per column = `n of m` (m = cohort members shown); the corner totals cell shows the cohort-wide `Σ of Σ`.
- [ ] **Step 4:** sticky: scroll container gets `maxHeight: "70vh", overflow: "auto"`; header `th` → `position: "sticky", top: 0, background: "var(--surface-card)", zIndex: 2`; first column `th/td` → `position: "sticky", left: 0, background: "var(--surface-card)", zIndex: 1`; the corner cell gets both + `zIndex: 3`.
- [ ] **Step 5:** `npm run typecheck && npm run lint`; visual check lands in Task 12. **Commit** `m10: progress matrix state colors, row and column totals, sticky headers`.

### Task 8: Settings — clinic_day + clinic_time

**Files:**
- Modify: `lib/settings-rules.ts`, `lib/settings-rules.test.ts`, `lib/settings.ts`, `lib/settings.test.ts`, `components/admin/settings-form.tsx`

**Interfaces:**
- `CLINIC_DAYS = ["monday", …, "sunday"] as const`; `validateClinicDay(raw): {ok:true; day: ""|ClinicDay} | {ok:false; reason:"invalid-day"}`; `validateClinicTime(raw): {ok:true; time:string} | {ok:false; reason:"invalid-time"}` (HH:mm 24h or empty).
- `Settings` becomes `{ bookingUrl; clinicText; clinicDay; clinicTime }`; `SettingsResult` reasons gain `"invalid-day" | "invalid-time"`. Keys: `clinic_day`, `clinic_time`.

**Steps:**

- [ ] **Step 1: failing tests**: `settings-rules.test.ts` — valid days (case/space tolerant), empty ok, "someday" rejected; times "18:00"/"09:05"/"" ok, "24:00"/"7pm"/"18:60"/"9:00" rejected. `settings.test.ts` — `getSettings()` returns the two new empties; admin saves `clinicDay: "thursday", clinicTime: "18:00"` and reads back; invalid day rejected without touching stored values.
- [ ] **Step 2:** run → fail. **Implement** rules + extend `lib/settings.ts` (`KEYS` += `clinicDay: "clinic_day"`, `clinicTime: "clinic_time"`; validate all four; upsert all four). Run → pass.
- [ ] **Step 3: form** `components/admin/settings-form.tsx`: add a `Weekly clinic day` `<select className="lmn-input" name="clinicDay">` (option "" = "No weekly clinic", then Monday…Sunday) and `Clinic time` `<Input name="clinicTime" type="time" />`, both controlled; error copy for the two new reasons ("Pick a real weekday for the clinic." / "The clinic time needs the 24-hour format, like 18:00."); clinic_text label becomes "Clinic note (optional)" with a dash-free placeholder ("Bring your kinetics questions."); helper under day/time: "Shown as a weekly marker on every calendar."
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`. **Commit** `m10: structured clinic day and time settings behind tested rules`.

### Task 9: Calendar — lib + pages + nav

**Files:**
- Create: `lib/calendar.ts`, `lib/calendar.test.ts`, `components/lumen/calendar-view.tsx`, `app/app/calendar/page.tsx`, `app/admin/calendar/page.tsx`
- Modify: `components/app/student-nav.tsx`, `app/admin/layout.tsx`, `app/globals.css`

**Interfaces:**
- `lib/calendar.ts` (pure, no server-only):
  ```ts
  export type CalendarRelease = { moduleId: string; weekNumber: number; title: string; courseName: string; releaseDate: Date };
  export type CalendarEntry =
    | { kind: "release"; time: string; moduleId: string; weekNumber: number; title: string; courseName: string; released: boolean }
    | { kind: "clinic"; time: string; note: string };
  export type CalendarDay = { iso: string; day: number; inMonth: boolean; today: boolean; entries: CalendarEntry[] };
  export type CalendarMonth = {
    title: string;            // "September 2026"
    monthParam: string;       // "2026-09"
    prev: string; next: string;
    weeks: CalendarDay[][];   // Monday-first rows
    agenda: { iso: string; label: string; entries: CalendarEntry[] }[]; // in-month days with entries, ascending
  };
  export function buildCalendarMonth(opts: {
    month?: string;           // "yyyy-mm" searchParam; invalid/absent → current month in tz
    now: Date;
    releases: CalendarRelease[];
    clinic: { day: string; time: string; note: string };  // day "" = no marker
    timeZone?: string;
  }): CalendarMonth;
  ```
  Mechanics: all calendar math on UTC-pinned dates (`Date.UTC(y, mo-1, d)` + `getUTCDay`), same DST-free approach as `mostRecentMondayAt`; a release lands on `wallParts(releaseDate, tz)`'s calendar day with `time = HH:mm` in tz; `released = releaseDate <= now`; clinic entry on every in-month day whose Monday-first index matches `CLINIC_DAYS.indexOf(day)` (skip when day is "" or unknown), `time` passed through (may be ""); `today` from `wallParts(now, tz)`; month param guard `^\d{4}-(0[1-9]|1[0-2])$` and year 2020–2100, else current month; grid padded to full Monday-first weeks with `inMonth: false` spill days (entries only on in-month days).
- `CalendarView({ cal, bookingUrl, heading })` server component renders the shared UI; pages provide data.

**Steps:**

- [ ] **Step 1: failing tests** `lib/calendar.test.ts` (import `CLINIC_DAYS` from settings-rules for the day names):
  - September 2026 (fixed `now = 2026-09-10T10:00:00Z`): title "September 2026", prev "2026-08", next "2026-10"; first grid cell is Mon 31 Aug (`inMonth: false`), last is Sun 4 Oct; `today` true only on 2026-09-10.
  - A release at `2026-08-31T21:30:00Z` lands on **1 September** in Athens (UTC+3) with time "00:30" and `released: true`; one at `2026-09-28T06:00:00Z` lands 28 Sep "09:00" `released: false` (after `now`).
  - Clinic `{ day: "thursday", time: "18:00", note: "x" }` → entries exactly on 3, 10, 17, 24 Sep; `{ day: "" }` → none.
  - Agenda lists only in-month days with entries, ascending, labels like "Tue 1 Sep"; releases outside the month are absent.
  - `month: "junk"` and `month: "2026-13"` fall back to `now`'s month.
- [ ] **Step 2:** run → fail. **Implement** `lib/calendar.ts`; reuse `wallParts` logic by exporting a small helper from `lib/tz.ts` (`wallClock(date, tz): {y, mo, d, h, mi}` wrapping the private `wallParts`) rather than duplicating. Run → pass.
- [ ] **Step 3: view** `components/lumen/calendar-view.tsx` + CSS in `globals.css`:
  - Header row: `<h1>` heading, prev/next as `IconButton icon="arrow_back"/"arrow_right" variant="outline" href={"?month=" + cal.prev/next}`, current month title, and `bookingUrl && <Button variant="primary" href={bookingUrl} external>Book a 1:1</Button>`.
  - `.lmn-cal-grid` (hidden ≤640px, `display:grid` ≥641px; 7 columns, linen borders, white day cells, cream + stone number for `inMonth: false`, blue ring or blue number for today): weekday header Mon…Sun caption row; each day cell lists entries as 12.5px pills: release → blue-tint bg + blue text (`released`) or linen bg + stone text (future), text "09:00 W6 Buffers"; clinic → white bg, 3px orange left border, ink text "18:00 Clinic".
  - `.lmn-cal-agenda` (shown ≤640px): per agenda day a caption date label + one white ListRow-style line per entry (release rows link to `/app/modules/[id]` only when `released` AND the consumer passes `linkModules` = student; admin agenda rows and future rows are plain), clinic rows with the orange left border; empty month → Card "Nothing on the calendar this month."
  - Clinic note (`clinic_text`) renders once under the header as the existing `.lmn-clinic` strip when set.
- [ ] **Step 4: pages**:
  - `app/app/calendar/page.tsx`: `requireStudent()`; `studentModuleList(user)` → releases from `[current, ...olderReleased, ...future]` (Rule 1 already applied; paused student never gets here, the layout short-circuits); course label = cohort name (CalendarView shows it in the pill title when the student has >1 active cohort, always for admin — pass `labelCourses: boolean`); `getSettings()` for clinic + booking; `searchParams: Promise<{ month?: string }>`.
  - `app/admin/calendar/page.tsx`: `requireAdmin()`; all modules joined to cohort names; `labelCourses` always true; same view, heading "Calendar".
- [ ] **Step 5: nav**: `components/app/student-nav.tsx` ITEMS gains `{ href: "/app/calendar", label: "Calendar" }` after Sessions; `app/admin/layout.tsx` nav gains `{ href: "/admin/calendar", label: "Calendar" }` after Progress.
- [ ] **Step 6:** `npm test && npm run typecheck && npm run lint && npm run build`. **Commit** `m10: read-only calendar for both roles; releases plus weekly clinic marker`.

### Task 10: Em/en-dash purge

**Files:**
- Modify: every `app/` + `components/` file the grep flags (41 files today; fewer after Tasks 2–9 already rewrote their copy).

**Steps:**

- [ ] **Step 1:** `cd /Users/dim/Dimitra-IB && grep -rn '—\|–' app components --include='*.tsx' --include='*.ts'` — list every remaining hit.
- [ ] **Step 2:** rewrite each: user-facing strings restructured with commas, colons, or periods (never a swapped hyphen); comments lose their dashes too so the grep criterion is unambiguous. Reference rewrites for the big ones: landing tagline → "Weekly IB Chemistry modules, practice that earns its solutions, and clinics for the hard parts. Structured teaching between lessons, without the scheduling."; paused screen → "Message Dimitra to continue. Your account and progress are safe and will be right here when you're back."; messages empty state → "No messages yet. Ask Dimitra anything about your modules."; dashboard clinic strip → `<b>Next clinic</b>: {clinicText}`; module titles like "Week 6 — Buffers" → "Week 6: Buffers" (admin edit h1).
- [ ] **Step 3:** verify: the same grep returns **zero**. `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 4: Commit** `m10: em and en dashes rewritten out of app/ and components/`.

### Task 11: Palette — token fixes, collision repair, landing pill

**Files:**
- Modify: `app/globals.css`, `components/lumen/core.tsx`, `components/lumen/learning.tsx`, `components/lumen/forms.tsx` (only if it uses the renamed vars), `lib/subject.ts`, `app/page.tsx`, `app/admin/progress/page.tsx` (driftwood leftover), `DESIGN.md`

**Steps:**

- [ ] **Step 1: reproduce the pill bug** before fixing: run `next dev`, headless-Chrome `getComputedStyle` on the landing "Student sign in" anchor; expect `color: rgb(255,255,255)` on a white background, and an `h2` computing graphite not indigo. Screenshot for the record.
- [ ] **Step 2: fix the token collision** in `globals.css`: palette block drops `--text-display:` and `--text-heading:` color lines; adds `--text-strong: var(--color-ink)` and `--text-heading-color: var(--color-indigo)`; `h1,h2,h3,h4{color:var(--text-heading-color)}`. Sweep every **color** usage: `grep -rn 'var(--text-display)\|var(--text-heading)' app components` and replace only where used as a color (`color:`/`colorColor` props) → `--text-strong` (ink sites: `.lmn-field-label`, `.lmn-btn-secondary`, `.lmn-iconbtn-outline`, `.lmn-clinic b`, `.lmn-rail-row h3`, Wordmark, ListRow/LessonRow titles, Toast message, LockPanel locked-title → `--text-heading-color`, `.lmn-note h2` → `--text-heading-color`, `.lmn-feature h2` → `--text-heading-color`, learning.tsx `solutions` icon color → `--text-heading-color`). Font-size usages keep their names.
- [ ] **Step 3: shrink to the owner's palette** in `globals.css`:
  - `--surface-hero: var(--color-indigo)` (solid); delete `--color-indigo-soft`.
  - `--color-blue-tint: rgba(0,97,239,.09)`; `--color-mint: rgba(0,168,107,.12)` (tints = alpha of brand hexes; they sit on white/cream surfaces only).
  - Delete `--color-ash`, `--color-driftwood`; `--border-input: var(--color-linen)`, `--border-divider: var(--color-linen)`.
  - Delete `--color-plum`, `--color-celeste`, `--subject-plum`, `--subject-celeste`, `--subject-orange`; keep `--subject-chemistry` (blue) + `--subject-indigo`.
- [ ] **Step 4: component sweep:** `lib/subject.ts` maps chemistry → `var(--subject-chemistry)`, everything else → `var(--subject-indigo)` (delete the plum/celeste/orange rows); `learning.tsx` `slides` kind color → `var(--text-heading-color)`; `app/page.tsx` step icon plum → `var(--color-indigo)`; confirm `--color-driftwood` has no references left (Task 7 already rewrote the matrix cell).
- [ ] **Step 5: landing pill:** `<Button variant="secondary" href="/login" style={{ color: "var(--color-indigo)" }}>Student sign in</Button>` — white pill, indigo text (owner option A); inline style outranks the hover rule.
- [ ] **Step 6: DESIGN.md**: §1 token table updated (collision errata note; `--text-strong` / `--text-heading-color`; tints as rgba; ash/driftwood folded into linen; plum/celeste/indigo-soft removed; hero solid indigo); §5 Badge loses the alert tone (error red stays for inline form errors only); ModuleCard recipe loses due/overdue; Nav recipe loses the name ("initials chip only"); §6 adds the Calendar recipe + updates `/`, `/app`, module, assignments entries; §9 rows #21 (overdue) marked superseded by M10, add a row for the calendar's native time input if kept; note the release form recipe (dd/mm/yyyy text field).
- [ ] **Step 7:** re-run the Step 1 probe: pill now white with indigo text; h2 indigo. `npm test && npm run typecheck && npm run lint && npm run build`. **Commit** `m10: palette locked to the owner list; text-token collision fixed; hero pill readable`.

### Task 12: Full verification walk + palette audit + ship

**Files:**
- Create (scratchpad only, not committed): `walk.mjs` palette+layout walker
- Modify: `SPEC.md` (§15.6 M10 checklist ticks), `PROJECT_REPORT.md` / `LAUNCH.md` (only if they state due-date behavior), memory files.

**Steps:**

- [ ] **Step 1:** fresh DB: stop dev server, `npm run db:migrate && npm run db:seed`; start `next dev`.
- [ ] **Step 2:** walker (playwright-core + `/Applications/Google Chrome.app/...`), for each of admin/dimitra, nikos, eleni, petros at 390×844 and 1280×900: log in, visit every route (`/`, `/login`, `/app`, `/app/courses`, `/app/assignments`, `/app/messages`, `/app/sessions`, `/app/calendar`, `/app/account`, one `/app/modules/[id]`, `/admin`, `/admin/requests`, `/admin/courses`, `/admin/modules`, one `/admin/modules/[id]`, `/admin/progress`, `/admin/calendar`, `/admin/messages`, one thread, `/admin/settings`, one `/admin/submissions/[id]`), assert `document.documentElement.scrollWidth <= viewport`, screenshot, and **collect every element's computed `color`, `backgroundColor`, `borderTopColor/Right/Bottom/Left`, `outlineColor`, `fill`, `stroke`**; normalize to rgb/rgba and assert each is transparent, a whitelisted palette rgb (`0061ef, 3b197f, f47d31, 00a86b, 1e7a4a, f9f4f2, ffffff, 131211, 2d2c2b, 63605d, e2ded9, c4320a`), or an rgba whose rgb part is one of those or pure white/black-ink used by the recorded translucency literals. Print any violator with selector + property; fix and re-run to zero.
- [ ] **Step 3:** functional spot-checks during the walk: admin sets clinic day thursday + time 18:00 + note via `/admin/settings` (exercises the new form); student + admin calendars show release pills on the right Athens days, the thursday clinic markers, and the Book a 1:1 button once `booking_url` is set; the new-module form rejects "31/02/2026" with the inline message and no browser popup, creates at "07/09/2026" and the module page shows "Releases Mon 7 Sep"; matrix shows jade/linen/stone cells, totals, sticky headers under scroll; students table shows "1 of 2" style figures; hero pill readable; nav shows chip only; dash grep zero.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint && npm run build` all green; tick SPEC §15.6 M10 checklist items that were actually verified (with date + method), update PROJECT_REPORT.md/LAUNCH.md if they mention due dates; commit `docs: M10 verified; SPEC checklist ticked`.
- [ ] **Step 5:** `git push origin claude/lumen-platform-orient-tc7fma`; `git pull --ff-only` is NOT run in the Desktop copy (stale, owner deletes it). Update memory `lumen-phase2-progress.md` with the M10 entry.

## Self-Review

- Spec coverage: owner items 1→Task 11+12, 2→5, 3→4, 4→2+3, 5→6+7, 6→8+9, 7→10, 8+recording→1; "done means" → 12. ✓
- The 16 due-date files all appear in Tasks 2–3. ✓
- Type consistency: `releaseDay` field name used in component, both forms, both actions, carry params; `--text-strong`/`--text-heading-color` introduced once, swept in one task; `CLINIC_DAYS` shared between settings-rules and calendar. ✓
- Order rationale: deadlines (2–3) precede the form rework (4) and matrix (7) so no task builds against a doomed column; the dash purge (10) runs after all copy-writing tasks; palette (11) last before the walk so the audit sees final CSS.
