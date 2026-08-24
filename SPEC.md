# Lumen — V1 Build Specification

**Status:** V1 built (M1–M5) · Phase 2 built (M6–M9) · M10 owner-review round in progress (§15.6/§15.7) · **Working title:** Lumen · **Last updated:** 2026-08-24

This document is the source of truth for V1 scope. Anything not listed in the Goals or Milestones is out of scope until this spec changes. When in doubt, build less.

---

## 0. What this is

A private learning platform for one IB tutor. Her existing 1:1 students migrate to a hybrid model: weekly pre-recorded modules (videos + slides + exercises) with her live time reserved for clinics and targeted 1:1s. Scale: 10–30 students in year one, one admin. **No payments in-app** — students pay via PayPal directly to the tutor; the platform controls access through two admin levers (see §5).

---

## 1. Problem

The tutor's income is capped by 1:1 hours, and most of each hour is spent re-explaining content she has taught many times. Students need structured weekly teaching, gated practice with solutions, and visible progress — without requiring her live presence for content delivery. Generic platforms can't do per-student access control tied to her offline payment reality, and links/Drive folders can't gate solutions, track progress, or look like a product worth paying for.

---

## 2. Goals (V1)

1. **Weekly cadence works end-to-end:** a student logs in, sees this week's module, watches videos, downloads slides/exercises, submits an attempt, and unlocks solutions — entirely on their phone.
2. **Access mirrors payments with two levers:** per-student active/paused flag + per-module release date. No other billing machinery.
3. **Solutions are earned:** solutions for a module are never visible before that student has submitted an attempt.
4. **The tutor is self-sufficient:** she publishes a full week (upload videos, PDFs, set release date) and manages student access in under 15 minutes, with zero developer involvement.
5. **Credible public face:** a one-page landing site that makes the program look like a real product to parents.

---

## 3. Non-goals (V1)

Explicitly not building these, so scope stays tight:

- **Payments / subscriptions / invoices** — PayPal happens offline; the active flag is the billing system.
- **In-app messaging** — she already has these students on WhatsApp; caps and inbox UI come later. *Amended (Phase 2, §15): one plain thread per student is in scope (M7); caps enforcement stays out.*
- **Session booking** — a Calendly link covers it. *Amended (Phase 2, §15): the app links out to Dimitra's Google Calendar appointment-schedule page (M8); still no booking logic or Calendar API.*
- **Parent accounts or digests** — parents look over shoulders in V1; digest emails are a fast-follow (see §13).
- **Analytics dashboards / auto-briefs** — V1 only *captures* events (see §6); no reporting UI yet.
- **Multi-tutor / multi-tenant** — one tutor, hardcoded assumptions are fine.
- **Native mobile apps** — responsive web, mobile-first.
- **DRM** — signed URLs + PDF name-stamping only; accept that screen recording exists.

---

## 4. Users & roles

- **Admin** — the tutor (and the developer). Full access to admin panel. 1–2 accounts.
- **Student** — sees only their cohort's modules, gated by the rules in §5.
- Parents are not users in V1.

---

## 5. Access model — two levers, three rules

**Payment reality:** money arrives in the tutor's PayPal outside the platform. She reflects it with one toggle.

- **Lever 1 — `users.active` (boolean):** she pauses a student who hasn't paid; unpauses when they do.
- **Lever 2 — `modules.release_date` (per module, per cohort):** weekly unlocks happen automatically on schedule. Publishing is not a weekly chore.

**Rule 1 — Module visibility**
- Given a logged-in student, When they open the module list, Then a module is **open** iff `module.cohort_id == student.cohort_id` AND `module.release_date <= now` AND `student.active == true`.
- Future modules in their cohort render as **locked teasers** showing title + "Unlocks {date}". Modules from other cohorts never render at all.

**Rule 2 — Solutions gating**
- Given an open module, When the student has **no** submission for it, Then materials of type `solutions` are hidden (shown as locked with "Submit your attempt to unlock solutions").
- When a submission exists, Then solutions become visible and the module is marked complete.

**Rule 3 — Paused behavior (deliberately blunt)**
- Given `student.active == false`, When they log in, Then they see a single friendly full-screen state: "Your access is paused — message {tutor name} to continue." No module list, no content, account and data preserved. Unpausing restores everything instantly.

These three rules are the entire business logic of V1. Resist adding cases.

*Amended (Phase 2, §15.2): from M6, Rule 1 is enrollment-based — a student may be enrolled in several cohorts, each enrollment can be paused independently, and join requests exist. Rules 2 and 3 are unchanged.*

---

## 6. Data model

Postgres. Six domain tables plus whatever the auth library needs.

**users** — `id`, `role` (`admin` | `student`), `name`, `email` (unique), `cohort_id` (nullable for admins), `active` (bool, default true), `created_at` *(Phase 2: `cohort_id` is replaced by the `enrollments` table — §15.3)*

**cohorts** — `id`, `name` (e.g. "Chemistry HL 2027"), `subject`, `level` (`HL` | `SL`), `exam_year` *(Phase 2: + `blurb`, `is_listed` — §15.3)*

**modules** — `id`, `cohort_id`, `week_number` (int), `title`, `description` (short), `release_date` (timestamptz) *(Phase 2: + `due_date`, nullable — §15.3; dropped again in M10 — §15.7 #16)*

**materials** — `id`, `module_id`, `type` (`video` | `slides` | `exercises` | `solutions`), `title`, `storage_key` (Bunny video ID or storage path), `sort_order`

**submissions** — `id`, `student_id`, `module_id`, `file_key` (nullable), `note` (nullable text), `created_at`. Unique on (`student_id`, `module_id`). A submission may be a file upload, a note, or just "I attempted this" — any of the three counts.

**events** — `id`, `student_id`, `material_id`, `type` (`video_progress` | `download` | `view`), `value` (int, e.g. seconds watched), `created_at`. **Write-only in V1.** No UI reads it. It exists because parent digests and clinic auto-briefs (§13) are built from this data, and retrofitting capture is much harder than logging from day one.

---

## 7. Screens

**Public**
- `/` — one-page landing: what the program is, how a week works, tutor bio + photo, "access by invitation", contact. Job: parent credibility, not conversion.

**Auth**
- `/login` — email field → magic link. No passwords anywhere. *Recorded substitution (owner decision, 2026-08-22): username + password sign-in; accounts and passwords are created/reset by the tutor in `/admin`. The invite-link flow is retired.*
- `/invite/[token]` — new student sets their name, lands in `/app`.

**Student** (mobile-first — assume a phone) *— Phase 2 adds `/app/courses`, `/app/assignments`, `/app/messages`, `/app/sessions`, `/app/account` and a student nav; see §15.4.*
- `/app` — modules grouped by week: completed (check), open, locked teaser with unlock date. Progress bar: completed ÷ released.
- `/app/modules/[id]` — videos (embedded player), slides (inline view + download), exercises (download), submit box (file and/or note and/or "mark attempted"), solutions section (locked until submission per Rule 2).

**Admin** (function over beauty — she is the only viewer) *— Phase 2 additions in §15.5.*
- `/admin` — students table: name, cohort, active toggle, last seen, invite-new-student.
- `/admin/modules` — list by cohort + new module.
- `/admin/modules/[id]` — edit title/description/release date; upload materials (drag-and-drop); reorder.
- `/admin/progress` — matrix: students × released modules, cell = submitted / not, with submission timestamp.

---

## 8. Core flows

**Tutor's weekly publish (target: under 15 minutes)**
1. Records locally while presenting slides (PowerPoint recorder / OBS) — 2–4 videos of 10–15 min each, not one long recording.
2. Admin → new module → drag in MP4s + slides PDF + exercises PDF + solutions PDF → set release date → done. Transcoding happens in the background; she doesn't wait for it.

**Student's weekly loop**
Login (magic link) → open this week's module → watch → download → attempt on paper → submit (photo/file or "attempted" + note) → solutions unlock → check work.

**Pause/unpause:** PayPal doesn't arrive → she toggles pause → student sees Rule 3 screen → payment arrives → untoggle.

---

## 9. Stack & infrastructure

Defaults below; equivalents you prefer are fine — **keep the shape** (boring monolith, Postgres, presigned uploads, signed playback, EU regions).

- **App:** Next.js (App Router) + TypeScript, single repo, no microservices.
- **DB:** Postgres + Drizzle ORM + migrations. Local via Docker in dev. *Recorded substitution (per this section's preamble): with `DATABASE_URL` unset, dev falls back to embedded Postgres (PGlite, `./pgdata-lite`) so a fresh clone needs no Docker; the Docker flow keeps working via `.env`.*
- **UI:** Tailwind + shadcn/ui.
- **Auth:** magic links (Auth.js email provider or hand-rolled signed tokens). **Dev mode: links print to the server console** — no email service needed until Milestone 3. Prod: Resend. *Recorded substitution (owner decision, 2026-08-22): hand-rolled username + password (scrypt hashes) with the same hashed server-side sessions; no email service in any environment. `RESEND_API_KEY` is no longer used.*
- **Video:** Bunny Stream, one library with **token authentication ON**. Admin uploads go browser → Bunny directly (upload URL created server-side); playback via embed/HLS with expiring signed tokens tied to a logged-in session.
- **Files (PDFs, submission uploads):** Bunny Storage or Cloudflare R2, presigned URLs both directions. **Dev mode: local `./storage` folder** behind the same interface.
- **PDF stamping:** on download, stamp footer "Prepared for {student name} · {email}" with `pdf-lib` (Milestone 5).
- **Deploy:** EU regions only (Hetzner VPS, or Vercel + Neon EU). Students are mostly minors — store minimal PII (name, email, cohort, nothing else), and account deletion = delete user row + their files.
- **Env vars:** `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`. All optional in dev (console/local fallbacks).

---

## 10. Build milestones

One milestone per session. Verify each checklist before starting the next. Milestones 1–2 require **zero external accounts**. *M1–M5 are built; Phase 2 milestones M6–M9 are specified in §15.6.*

### M1 — Skeleton & gating
Schema + migrations; seed script (1 admin, 1 cohort, 3 students — one paused, 4 modules — 2 released / 2 future, placeholder materials, 1 pre-seeded submission); magic-link auth with console delivery; role middleware; student module list + module page implementing Rules 1–3 off seed data.

**Verify:**
- [ ] Log in as seeded student via console link; see 2 open modules + 2 locked teasers with dates
- [ ] Paused student sees only the Rule 3 screen
- [ ] Module with pre-seeded submission shows solutions; the other hides them with the unlock hint
- [ ] Student cannot reach `/admin` (redirects); admin can
- [ ] Other cohort's modules invisible even by direct URL

### M2 — Admin CRUD & invites
Cohorts, students (create → invite email w/ console delivery, active toggle), modules (create/edit, release date), material upload to the **local storage** fallback, reorder.

**Verify:**
- [ ] Create cohort → student → invite link (console) → student completes onboarding on a phone-sized viewport
- [ ] Create module with future date → invisible to student until date passes (test by editing the date)
- [ ] Toggle a student paused → Rule 3 screen immediately

### M3 — Real infrastructure
Bunny Stream direct upload + signed playback; Bunny Storage/R2 presigned PDFs; Resend magic links. Dev fallbacks remain behind env-var switches.

**Verify:**
- [ ] Upload a real MP4 in admin; it transcodes and plays for a logged-in student
- [ ] Copy the video embed URL into an incognito window → playback **fails** (token expired/invalid)
- [ ] PDFs upload/download via presigned URLs; magic link arrives by email

### M4 — Submissions, progress, events
Submission box (file / note / mark-attempted); Rule 2 unlock; completion state + progress bar; `/admin/progress` matrix; event logging (video progress every 30s, downloads, views).

**Verify:**
- [ ] Submit with photo from a phone → solutions unlock instantly, module shows complete, progress bar moves
- [ ] Matrix shows the submission with timestamp; a second submit for the same module is blocked (unique constraint)
- [ ] Watch 2 min of video → `video_progress` rows exist with sane values

### M5 — Landing, stamping, polish, deploy
Landing page; PDF name-stamping on download; empty/locked/error states with friendly copy; full mobile pass; deploy to EU with real env vars; backups on (managed Postgres or nightly dump).

**Verify:**
- [ ] Landing renders well on a phone and says nothing false
- [ ] Downloaded slides carry "Prepared for {name}" footer
- [ ] Full student loop and full admin publish flow both work **on the production URL**
- [ ] `.env.example` complete; README covers deploy + restore-from-backup

---

## 11. Definition of done (V1)

- The tutor onboards a real student end-to-end (create → invite → student logs in) with no developer help.
- She runs **two consecutive weeks** — publish, auto-release, monitor, one pause/unpause — with zero developer intervention.
- Targets: all migrated students log in during week 1; ≥80% submit weekly by week 3; her platform admin time ≤15 min/week.

---

## 12. Design notes

- **Mobile-first for students** — assume a phone; test every student screen at 390px first.
- Calm, credible, parent-friendly; the tutor's name and photo on the landing page — she is the brand.
- UI language: English (IB students operate in English). Copy is short and jargon-free.
- Locked states do quiet marketing: "Unlocks Monday 09:00" beats a padlock icon.
- Admin panel: plain and fast; no design effort beyond shadcn defaults.

---

## 13. Parking lot (P2 — design so these stay possible; build none now)

Parent monthly digest email (built from `events` + `submissions`) · clinic auto-briefs (most-missed questions per cohort per week) · in-app messaging with per-plan caps *(Phase 2 builds the thread without caps — §15)* · 1:1 booking *(Phase 2 links out — §15)* · per-student video watermarking · payments/subscriptions · multi-tutor tenancy · per-module MCQ self-check (5 questions, auto-marked, jade feedback) *(Phase 3 candidate — owner decision after the pilot)*.

---

## 14. Open questions

- **Name & domain** — "Lumen" is a working title; confirm before the landing page ships (non-blocking until M5). *Owner: tutor + developer.*
- **Vendor account ownership** — Bunny/Resend/domain should live under the tutor's accounts for continuity; developer gets access. *Owner: both. Non-blocking until M3.*
- **Slides inline viewer vs download-only** — default: inline browser view + stamped download; confirm she's happy exercises are download-only. *Owner: tutor. Non-blocking.*
- **Greek copy for parents on the landing page** — default English-only in V1. *Owner: tutor. Non-blocking.*

---

## 15. Phase 2 amendments (owner-directed, 2026-08-22)

The owner amended this spec for Phase 2. Everything below **overrides** the earlier sections where they disagree; the earlier text is kept so the history stays readable, with *Amended* pointers at each affected spot. Username + password auth (§7/§9 substitutions) stays exactly as is. Conflicts found while applying the amendments are listed in §15.7 — flagged, not silently resolved.

### 15.1 Decisions (locked by the owner)

- **Enrolment:** students browse a course catalog and **"Ask to join"**; Dimitra approves (payment stays offline-first). No self-checkout.
- **Deadlines are SOFT:** a due date shows on modules and an *overdue* badge appears when missed; **submission is never blocked**. *Amended (M10, §15.7 #16): deadlines are removed entirely — no due dates, no overdue state anywhere.*
- **Sessions:** Google Meet, scheduled through Dimitra's Google Calendar appointment-schedule booking page. The app links out; **no Calendar API integration** in this phase.

### 15.2 Gating update (Rule 1 rewritten; Rules 2 and 3 unchanged)

**Rule 1 — Module visibility (enrollment-based).** A module is **open** iff the student has an **active enrollment** in the module's cohort AND `module.release_date <= now` AND `users.active == true`. Future modules in enrolled (active) cohorts render as **locked teasers**. Everything else — no enrollment, a *requested*, *paused* or *ended* enrollment, another cohort — is **invisible** (404 on direct URL, never rendered, never served).

**Paused enrollment.** A paused *enrollment* hides that course's modules and shows "paused — talk to Dimitra" on the course card; the student's other courses keep working.

**Rule 3 is unchanged:** `users.active` stays the global master switch — `false` still shows the full-screen paused state on every `/app` route, regardless of enrollments.

**Soft deadline (presentation rule, not a gate):** a released module is *overdue* iff `due_date` is set, `now > due_date`, and the student has no submission for it. Submitting clears the badge. Nothing is ever blocked by a due date. *Amended (M10, §15.7 #16): rule deleted with the column.*

`lib/gating.ts` remains the single tested home of these rules.

### 15.3 Schema deltas (one migration, carefully backfilled)

- **enrollments** — `id`, `student_id`, `cohort_id`, `status` (`requested` | `active` | `paused` | `ended`), `requested_at`, `decided_at`; unique (`student_id`, `cohort_id`). **Backfill:** one *active* enrollment from every existing `users.cohort_id`, then **drop that column**. `users.active` stays as the global master switch (Rule 3 screen unchanged).
- **cohorts** += `blurb` (text), `is_listed` (bool, default false) — catalog fields.
- **modules** += `due_date` (timestamptz, nullable). The admin form defaults it to the **Sunday 23:59 after release**, tutor timezone. *Amended (M10, §15.7 #16): column dropped again by migration 0006.*
- **messages** — `id`, `student_id`, `sender` (`student` | `tutor`), `body`, `created_at`, `read_at`. **One thread per student** — not per course.
- **settings** — key/value: `booking_url`, `clinic_text` — editable in admin. *Amended (M10, §15.7 #18): + `clinic_day`, `clinic_time` for the calendars' weekly clinic marker; `clinic_text` becomes the optional note.*

### 15.4 Student pages (all mobile-first, 390px first)

- **`/app` dashboard** — as before, plus: due date on the hero card, overdue badges on rows *(both removed in M10 — §15.7 #16)*, unread-messages dot in the nav. With several active enrollments the list spans all of them (rows name their course); with a single enrollment the page is exactly what a pre-migration student saw.
- **`/app/courses`** — *my courses* (active / paused states) + *catalog* of `is_listed` courses with **"Ask to join"** → request created, button becomes **"Requested"**.
- **`/app/assignments`** — every open module across enrollments with its due date; overdue badge; completed section below. This is the "what do I owe" page. *Amended (M10, §15.7 #16): the list of released modules not yet submitted, completed below; no due dates.*
- **`/app/messages`** — single thread with Dimitra: composer (trimmed, max 4000 characters, empty submits rejected server-side), sent/received bubbles with timestamps in the tutor's timezone, unread tutor messages marked read when the thread is opened. Simple polling refresh; no websockets. Empty state: "No messages yet — ask Dimitra anything about your modules." The student header shows an unread dot on Messages. No events/analytics for messages in this phase.
- **`/app/sessions`** — next clinic (`settings.clinic_text`) + **"Book a 1:1 on Google Meet"** button opening `settings.booking_url` in a new tab.
- **`/app/account`** — change own password (current + new, min 8, same scrypt path).

A student nav (Home · Courses · Assignments · Messages · Sessions · Account, added as the milestones land) is mounted **once**, in the `/app` layout.

### 15.5 Admin additions

- **Requests queue** — pending join requests; **approve** (→ active enrollment) / **decline**.
- **Courses** — edit `blurb` + `is_listed` per cohort (cohort creation moves here).
- **Students** — per-student enrollments with pause / resume / end, and "add to course"; the global active toggle stays.
- **Modules** — `due_date` field (defaulting per §15.3). *Amended (M10, §15.7 #15/#16): field removed; release day is dd/mm/yyyy at a fixed 09:00 Athens.*
- **`/admin/messages`** — all threads sorted by latest activity, unread counts (the admin nav shows the unread total), open a thread, reply. **Replying** marks that thread read for the tutor. Only admins reach the inbox.
- **Progress matrix** — clicking a submitted cell opens that student's submission (file + note) — admin-only read path; students still can never read submissions back.
- **Settings page** — `booking_url`, `clinic_text`.

### 15.6 Milestones (one per session; verified, then pushed to origin)

**M6 — Enrollments + catalog + deadlines.** Migration, gating rewrite + tests, courses page, request/approve, assignments page.
Verify (walked 2026-08-22 in Chrome at 390px and 1280px against the seeded dev DB — `docs/superpowers/plans/2026-08-22-m6-enrollments-catalog-deadlines.md`):
- [x] a two-course student sees both
- [x] a requested course shows no modules
- [x] pausing one enrollment hides only that course
- [x] overdue badge appears after due date and clears on submit
- [x] every pre-migration student still sees exactly what they saw before

**M7 — Messages.** Verify (walked 2026-08-22 in Chrome at 390px and 1280px; authz in `lib/messages.test.ts`):
- [x] both directions work
- [x] unread clears on open (student); replying clears it for the tutor
- [x] student A can never read student B's thread — tested in `lib/messages.test.ts`, including a direct POST with a forged student id, a student calling the admin paths, and a paused actor
- [x] only admins reach the inbox (a student is redirected from `/admin/messages` and from another student's thread URL)
- [x] a globally paused student still sees only the Rule 3 screen, messages included

**M8 — Sessions + account password change + admin submission viewer + settings.** Verify (walked 2026-08-22 in Chrome at 390px and 1280px; rules in `lib/account.test.ts`, `lib/settings*.test.ts`, `lib/submissions.test.ts`):
- [x] old password stops working after change (and the new one works; the student's other device is signed out — §15.7 #11)
- [x] admin opens a real uploaded submission (PNG + note) from the progress matrix; students and anonymous requests get 404 on the file route
- [x] booking button opens the Google page in a new tab; an invalid `booking_url` is rejected server-side
- [x] a globally paused student still sees only the Rule 3 screen on `/app/sessions` and `/app/account`

**M9 — Restyle** (walked 2026-08-22: every student page and every admin route audited in Chrome at 390px and 1280px — `scrollWidth ≤ viewport`, no sunbeam in any computed style, green text only Forest, orange backgrounds only with ink text and at most one per view, no icon-font remnants; tests/typecheck/lint/build green, 111 tests untouched)
- [x] palette, type and icons replaced; DESIGN.md rewritten; old direction marked superseded
- [x] one header per page (TopBar removed; the nav bar is the only header)
- [x] behavior unchanged — gating, routes and all 111 tests untouched

Brief: to Dimitra's palette using `design/lumen-dashboard-mockup.html` as the **authoritative** reference (`design/extracted/tokens.css` secondary): Blue `#0061EF` for the nav bar, links, selected states and standard primary buttons; Indigo `#3B197F` for headings and the hero band; Orange `#F47D31` for exactly one motivational CTA per view ("Continue" / "Start module"), ink text on orange — never white; Jade `#00A86B` for fills (progress, checks, pips) with Forest `#1e7a4a` whenever green is text; Cream `#F9F4F2` page, white cards; **no yellow anywhere** — the palette dropped it. Replace the icon font with inline SVGs everywhere; type is Plus Jakarta Sans with tight negative tracking on headings. Update DESIGN.md to the new tokens and note the old direction as superseded. Behavior must not change: gating, routes, and all tests stay green untouched. Verify every student page and the admin at 390px and 1280px: no horizontal scroll, contrast holds (green text = Forest, orange CTA = ink text), no yellow survives.

**M10 — Owner review round 1** (directive of 2026-08-24; decisions in §15.7 #13–#19). Palette audit + landing pill fix, initials-only nav identity, dd/mm/yyyy release entry at a fixed 09:00 Athens, deadlines removed end to end, admin progress at a glance, read-only calendar for both roles, em/en-dash purge.
Verify (walked 2026-08-24 in headless Chrome against the freshly seeded dev DB — the walker collects every element's computed colours on every route, both roles, at 390px and 1280px; script + screenshots in the session scratchpad; plan `docs/superpowers/plans/2026-08-24-m10-owner-review.md`):
- [x] palette walk (computed styles, every route, both roles, 390px and 1280px): zero colours outside the §15.7 #13 set; landing "Student sign in" pill readable (white pill, computed `rgb(59,25,127)` text); headings indigo (the M9 token collision had them graphite — root cause in #13)
- [x] student and admin headers show the initials chip only
- [x] new-module form: dd/mm/yyyy entry; "31/02/2026" produced the friendly inline message with no browser popup and no navigation; "07/09/2026" created a module badged "Releases Mon 7 Sept" (= 09:00 Athens, tz-tested in `lib/tz.test.ts`); no due-date field
- [x] no due-date remnants: grep clean over app/components/lib/db (historical migrations excepted); /app/assignments = released not yet submitted (`lib/queries.test.ts`)
- [x] students table shows "x of y" + jade bar per course; matrix shows jade/linen/stone cells, row+column totals ("1 of 2", "Submitted 1 of 3"), sticky headers verified by computed `position: sticky`; "Set password" fully visible inside its cell
- [x] both calendars walked at 390px (agenda list) and 1280px (month grid): seeded releases on their Athens Mondays, four Thursday clinic markers from clinic_day+clinic_time, "Book a 1:1" button from booking_url; a paused student still sees only the Rule 3 screen on /app/calendar
- [x] `grep -rn '—\|–' app components --include='*.tsx' --include='*.ts'` returns zero (seed-data strings rewritten too)
- [x] tests (117), typecheck, lint, build green

**Still out of scope:** payments, parent accounts, message-cap enforcement, Calendar API sync, email notifications, auto-briefs, multi-tutor, individually booked 1:1s on the calendar.

### 15.7 Conflicts flagged while applying the amendments

| # | Earlier text | Amendment | Status |
|---|---|---|---|
| 1 | §3: in-app messaging is a non-goal; DESIGN.md §9 #10 parks "Message Dimitra" | M7 builds one thread per student (no caps) | Owner decision — §3 annotated; DESIGN.md §9 #10 to be updated in M7 |
| 2 | §3: session booking = Calendly link; DESIGN.md §8 parks the Clinics screen | M8 `/app/sessions` = clinic text + link-out button (not the parked Clinics/SessionCard screen) | Owner decision — the simpler page; SessionCard stays parked |
| 3 | §6 / DESIGN.md §9 #6: exactly one cohort per student, no class switcher | Enrollments allow several cohorts per student | Owner decision — `/app` aggregates across active enrollments; no class switcher is built |
| 4 | §5: "three rules … resist adding cases" | Rule 1 gains enrollment status + paused-enrollment state; soft deadline added | Owner decision — recorded as a rewrite of Rule 1 plus one presentation rule, still in one tested module |
| 5 | §7: `/admin` students table has a *cohort* column and the create form picks one cohort | Students can hold several enrollments | Create form keeps one cohort (→ active enrollment); more enrollments are added per row |
| 6 | DESIGN.md §8: TabBar and DeskNav page links deferred (single student destination) | Six student pages need a nav | Nav links built from the DeskNav link recipe, mounted once in the `/app` layout; restyled in M9 |
| 7 | §15.3 lists the `status` values but not what *decline* does | — | **APPROVED (owner, 2026-08-22):** decline **deletes** the request row; the student may ask again. `ended` is an admin-set state for students who left a course |
| 8 | Default due date "Sunday 23:59 after release" | — | **APPROVED (owner, 2026-08-22):** the first Sunday 23:59 (tutor timezone) strictly after the release instant. *Superseded (M10): deadlines removed — see #16* |
| 9 | `/app` hero ("this week") tie-break when two courses release the same day was by module id | — | **Owner decision (2026-08-22):** most recent release wins; ties → the module with the **nearest due date**; still tied → **alphabetical course title**; same course, same release and due → higher week number. Never by id. Covered by `lib/current.test.ts`. *Superseded (M10): the due step drops out — see #16* |
| 10 | `design/lumen-dashboard-mockup.html` was an untracked local file | M9 needs it as the restyle reference | **Owner decision (2026-08-22):** committed to the repo |
| 11 | §15.4 `/app/account`: "change own password (current + new, min 8, same scrypt path)" says nothing about existing sessions | — | **APPROVED (owner, 2026-08-22):** a successful change signs out the student's other devices (their other session rows are deleted; the current device stays) |
| 12 | §15.3 `booking_url` has no format rule | — | **APPROVED (owner, 2026-08-22):** must be an absolute `http(s)://` URL or empty (a `javascript:` value would become a live new-tab link); `clinic_text` is trimmed and capped at 2000 characters |
| 13 | M9 palette carried extra hexes (tints, plum/celeste subject colours, indigo-soft hero companion, ash/driftwood greys); DESIGN.md defined `--text-display`/`--text-heading` as colours in §1 AND as sizes in §2 | M10 palette audit: only the owner's list may render | **APPROVED (owner, 2026-08-24):** brand colours are exactly blue `#0061EF`, indigo `#3B197F`, orange `#F47D31`, jade `#00A86B` (Forest `#1e7a4a` whenever green is text); page `#F9F4F2`, cards `#FFFFFF`. Text stays ink/graphite (recorded deviation from `#000000`, reaffirmed); stone/linen stay as the muted-text/border neutrals (the owner names them in #17); tints must render as alpha of brand hexes, never standalone hexes; error red `#c4320a` remains the sole functional exception (inline form errors only); the hero flattens to solid indigo (indigo-soft removed); subject colours reduce to blue (chemistry) / indigo (everything else). The colour-vs-size token collision (found in this audit: `color:var(--text-display)` resolved to `52px`, so the landing "Student sign in" pill inherited white-on-white and headings inherited graphite) is fixed by `--text-strong` (ink) and `--text-heading-color` (indigo); the landing pill becomes a white pill with indigo text |
| 14 | DESIGN.md §5 Nav: "who" = first name (hidden < 1024) + initials chip; the admin bar showed no identity | — | **APPROVED (owner, 2026-08-24):** initials chip only — the name text is removed from the student header, and the admin header gains the same chip |
| 15 | §15.3 / M6: release entered as `datetime-local` with a due-date companion | — | **APPROVED (owner, 2026-08-24):** the module form takes the release day as plain `dd/mm/yyyy` text, required with a friendly inline message instead of the browser popup (no native picker); release **time** is no longer an input — always 09:00 Europe/Athens; saving an older module re-pins its release to 09:00 that day. The due-date field is removed (#16) |
| 16 | §15.1 "Deadlines are SOFT"; #8 due default; #9 nearest-due hero tie-break | Owner reversal after first hands-on review | **APPROVED (owner, 2026-08-24):** deadlines are removed entirely. Migration 0006 drops `modules.due_date`; `isOverdue`, overdue badges and every due label are deleted; `/app/assignments` becomes the list of released modules not yet submitted; the hero tie-break becomes most recent release → course title A-Z → higher week number. Recorded assumption: the open-assignments list uses that same order (newest release first) |
| 17 | §7 `/admin` and `/admin/progress` are plain tables; the actions column truncated "Set password" | — | **APPROVED (owner, 2026-08-24):** students table gains a per-course completion figure ("submitted x of y released") with a small jade bar; the progress matrix gains cell colour states (jade submitted · linen released-pending · stone unreleased), row and column totals, and sticky headers; the actions column stacks vertically so nothing truncates |
| 18 | §3 non-goal: booking logic / Calendar API; no calendar screen existed anywhere | A read-only calendar for both roles | **APPROVED (owner, 2026-08-24):** `/app/calendar` and `/admin/calendar` join the navs. Entries: module release dates (students see their active courses, admin sees all cohorts labeled), a recurring weekly clinic marker driven by new structured settings `clinic_day` + `clinic_time` (`clinic_text` stays as an optional note), and a "Book a 1:1" button using `booking_url`. Month grid on desktop, agenda list at 390px; read-only, computed from the database. Individual Google-booked 1:1s are explicitly out of scope |
| 19 | UI copy has carried em/en dashes since M1 (89 occurrences in app/ and components/) | UI copy style rule | **APPROVED (owner, 2026-08-24):** no em or en dashes in app/ or components/ strings; sentences are restructured with commas, colons, or periods — never a swapped-in hyphen. Repo docs are exempt |
