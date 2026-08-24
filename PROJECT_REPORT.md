# Road to Success: Project Report

*A complete technical report on what has been built and how it works, regenerated strictly from the repository at HEAD on 2026-08-24, after Phase 2 (M6–M9), the owner-review round M10 (deadlines removed, calendar added, palette audited), the M11/M12 information-architecture rebuild, and the go-live round (self-hosted video, pasted video links, vendored fonts). Written to be handed to an AI assistant or a new developer as full project context. The remaining work before real students use it is in `LAUNCH.md`.*

---

## 1. What Road to Success is

Road to Success (formerly the working title Lumen; renamed 2026-08-24, SPEC §15.7 #20) is a **private learning platform for one IB tutor, Anglou Dimitra**. Her 1:1 chemistry students move to weekly pre-recorded modules — videos, annotated slides, exercise sets — with worked solutions gated behind a submitted attempt. Payment happens offline (PayPal); the platform mirrors it with one global toggle per student plus, since Phase 2, per-course enrollments.

- **Scale:** 10–30 students, one admin (the tutor), one tenant. Deliberately small and boring.
- **Sources of truth:** `SPEC.md` (scope/behavior; §15 holds the owner's Phase 2 amendments, milestones M6–M12 with their verified checklists, and the decision log §15.7, which is authoritative on every owner reversal), `DESIGN.md` (Dimitra's palette, tokens, component and screen recipes), `CLAUDE.md` (working rules). The gating rules in `lib/gating.ts` are *the entire business logic*.
- **Audience note:** students are mostly minors; the app stores name, username, email and course membership — nothing else — and is meant to deploy EU-only.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack), TypeScript strict, single monolith |
| Database | Postgres + Drizzle ORM 0.45.2 with SQL migrations (`db/migrations`, 0000–0007). Dev default: **embedded Postgres (PGlite 0.5.5)** in `./pgdata-lite`. Optional real Postgres 16 via `docker-compose.yml` + `.env`. Production requires `DATABASE_URL` (the app refuses PGlite in production). |
| Styling | Tailwind 4 utilities + the in-repo design system (`app/globals.css` tokens/classes, `components/rts/*`) in Dimitra's palette. Type: Plus Jakarta Sans, vendored under OFL in `assets/fonts/plus-jakarta-sans/` and self-hosted by `next/font/local` (SPEC §15.7 #26). Icons: inline SVG (`components/rts/icon.tsx`). **No third-party requests on any page.** |
| Auth | Username + password (scrypt via `lib/password.ts`) + hashed server-side sessions (`lib/auth.ts`) + DB-backed lockout (`lib/lockout.ts`). No auth library, no email service. |
| Files | One `FileStorage` interface (`lib/storage.ts`) with one implementation: the server's own `storage/` folder, in dev and in production (SPEC §15.7 #25). No media vendor, no keys |
| Video | Self-hosted: `<video>` against `/api/materials`, which enforces the gating rules per request and streams range slices from a file offset. Per video, the tutor may instead paste a link to a video she hosts elsewhere (Loom / Google Drive / unlisted YouTube) |
| PDF stamping | pdf-lib + @pdf-lib/fontkit with a bundled Noto Sans (Greek-capable) |
| Tests | Vitest — **182 tests** over pure rules and DB-backed modules (in-memory PGlite) |

A fresh clone needs **only Node.js**: `npm install && npm run dev`.

## 3. How to run it

```bash
npm install
npm run dev          # → http://localhost:3000
```

With no `DATABASE_URL` set, `predev` (`scripts/ensure-dev-db.ts`) boots the embedded PGlite database, applies migrations, and seeds demo data when the users table is empty. No Docker, no `.env`.

Seeded accounts — **the password for every account is `success123`**:

| Account | Username | State |
|---|---|---|
| Admin (tutor) | `dimitra` | full admin panel; one pending join request (nikos → Chemistry SL) |
| Student | `nikos` | Chemistry HL active, week 5 submitted; has asked to join Chemistry SL |
| Student | `eleni` | Chemistry HL **and** SL active (two courses); week 5 not submitted |
| Student | `petros` | **paused** globally → sees the Rule 3 screen |

A listed Mathematics AA SL 2027 cohort (no modules) sits in the catalog for "Ask to join".

Other commands: `npm run build` / `start`, `npm run db:generate` (migration from `db/schema.ts`), `npm run db:migrate`, `npm run db:seed` (wipe + reseed; stop the dev server first — the embedded DB is single-process; a non-empty `DATABASE_URL` database needs `--force`), `npm test`, `npm run typecheck`, `npm run lint`.

**Environment note:** keep the checkout outside iCloud-synced folders (Desktop/Documents with "Optimize Mac Storage"): evicted `node_modules` and `pgdata-lite` files stall the toolchain for minutes per read.

## 4. The business logic — `lib/gating.ts`

Two admin levers — `users.active` (global switch) and `modules.release_date` (weekly unlocks) — plus, since Phase 2, per-course enrollment status. Pure, unit-tested functions; every page *and* every byte-serving route re-derives them per request.

1. **Rule 1 — Module visibility** (`moduleState(module, access, now)` → `open | locked-teaser | invisible`): open iff the student has an **active enrollment** in the module's cohort AND `release_date <= now` AND `users.active`. Future modules in active cohorts are locked teasers ("Unlocks {date}"). Everything else — no / requested / paused / ended enrollment, another cohort, a globally paused student — is invisible: never rendered, 404 by direct URL. `lib/access.ts` loads the enrollment list once per request.
2. **Rule 2 — Solutions gating** (`solutionsVisible(hasSubmission)`): solutions stay hidden until the student has any submission for the module (file, note, or bare "attempted"); the same fact marks the module complete.
3. **Rule 3 — Paused behavior** (`isPaused`): `users.active = false` shows only the full-screen "Your access is paused" state on every `/app` route (messages, schedule, account included). Pages that write also return early for a paused actor, because Next renders page segments in parallel with the layout.
4. **No deadlines.** M10 (SPEC §15.7 #16) removed due dates entirely — migration 0006 dropped the column; only the release instant gates anything.

`lib/current.ts` picks "this week's" module: most recent release → course title A–Z → higher week number (SPEC §15.7 #16).

## 5. Data model (`db/schema.ts`, 10 tables)

- **`cohorts`** — name, subject, level (HL/SL), exam year, `blurb`, `is_listed` (catalog).
- **`users`** — role, name, `username` (unique), `password_hash` (scrypt), `failed_logins` + `locked_until`, email (unique; contact + stamping only), `active` (the global switch), `last_seen_at`, `created_at`. *`cohort_id` was removed in M6.*
- **`enrollments`** — student × cohort (unique), `status` `requested | active | paused | ended`, `requested_at`, `decided_at`. Migration 0005 backfilled one active row per old `users.cohort_id` before dropping the column (`db/migrate.test.ts` replays it against real SQL). Lifecycle: student asks → admin approves (active) or declines (row deleted; they may ask again); admin can pause / resume / end; an ended student may ask again.
- **`modules`** — cohort, week number (unique per cohort), title, description (the weekly note), `release_date` (entered as a dd/mm/yyyy day; always 09:00 Europe/Athens — SPEC §15.7 #15; `due_date` was dropped by migration 0006).
- **`materials`** — module, type (`video | slides | exercises | solutions`), title, sort order, and **either** `storage_key` (a path in the server's `storage/`) **or** `external_url` (a pasted video link). Migration 0007 made `storage_key` nullable, added `external_url`, and added a check constraint holding exactly one of the two: a row with neither shows a student nothing, a row with both is two answers to where it plays (SPEC §15.7 #25).
- **`submissions`** — student × module (unique), optional `file_key`, optional note, timestamp. Write-only for students; admin-only read path.
- **`messages`** — student, sender (`student | tutor`), body (trimmed, ≤ 4000), `created_at`, `read_at`. One thread per student.
- **`settings`** — key/value: `booking_url`, `clinic_text`.
- **`events`** — write-only analytics (`view`, `download`, `video_progress`); nothing reads it yet. No events for messages.
- **`sessions`** — SHA-256 of the token, 30-day expiry.

## 6. Authentication and authorization

- `/login`: username + password → scrypt verify (dummy hash for unknown users; uniform timing) → lockout after 10 failures for 15 minutes (`lib/lockout.ts`) → session cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production).
- The tutor creates accounts and resets passwords in `/admin/students`; students change their own on `/app/account` (`lib/account.ts` — current + new, min 8; a change deletes their other session rows, SPEC §15.7 #11).
- `proxy.ts` gates `/app/*` and `/admin/*` on cookie presence; the real checks are `requireAdmin()` (`lib/admin.ts`) and `requireStudent()` (`lib/student.ts`) in every page and action, and the data modules re-check the **acting user row**: `lib/messages.ts`, `lib/settings.ts`, `lib/submissions.ts` all take the actor and throw for the wrong role; the student message path ignores any student id sent by the client (tested with a forged id).

## 7. Student experience (`app/app/*`, mobile-first at 390px)

The blue nav bar (`app/app/layout.tsx`, mounted once) carries exactly **Courses · Messages (unread dot) · Schedule**, with Account behind the initials chip and the RTS monogram below 640px (SPEC §15.7 #24). Rule 3 lives in this layout.

- **`/app` — My courses.** One card per enrollment (active and paused states) with the progress bar, "Week N of M", the new-this-week line, and a Continue button deep-linking into that course's current module, so a single-course student pays no extra tap. Only the overall current course's Continue is orange (the one orange CTA per view); the others are primary blue. The catalog of listed cohorts with "Ask to join" sits below.
- **`/app/courses/[id]`** — inside one course: the weekly note card for the latest released week, then that course's week rail (done with Review, current with the single orange Continue, locked with unlock dates). Rule 1 404s a course without an active enrollment, even by direct URL.
- **`/app/modules/[id]`** — back link, module title, badge row (New this week / course / Attempt sent), LessonRows (videos to the watch page; slides inline + stamped download; exercises download), then the solutions block: the locked panel whose "Submit my attempt" (the page's orange CTA) opens the bottom sheet (photo/PDF ≤ 25MB, note, or "just mark as attempted"), or the unlocked panel + solutions row.
- **`/app/modules/[id]/watch/[materialId]`** — an uploaded video streams from `/api/materials` in a `<video>` with progress capture. A pasted link renders as an in-page embed for YouTube, Loom or Google Drive (with an "open it in a new tab" escape hatch), and as an "Open video" panel for any other host. Either way the visit logs one `view`; a link reports no watch position back, and per-lesson done states stay parked, so it is a single Watch step (SPEC §15.7 #25).
- **`/app/messages`** — the single thread with Dimitra: bubbles with tutor-timezone timestamps, composer (server-enforced rule, inline errors), empty state, 15-second polling; opening marks her messages read.
- **`/app/schedule`** — Sessions and Calendar merged: read-only month (grid ≥ 641px, agenda at 390px) with release days across active courses and the weekly clinic marker from `settings.clinic_day`/`clinic_time`, the clinic note, and "Book a 1:1 on Google Meet" (new tab to `settings.booking_url`). No Calendar API.
- **`/app/account`** — identity + change own password.
- **Retired routes** still answer, as redirects: `/app/courses` → `/app`, `/app/assignments` → `/app`, `/app/sessions` and `/app/calendar` → `/app/schedule` (SPEC §15.7 #24).

## 8. Admin experience (`app/admin/*`, same blue bar with an ADMIN label)

The admin nav is exactly **Courses (home) · Students · Messages (unread count) · Calendar · Settings**, plus the initials chip and sign out (SPEC §15.7 #23).

- **`/admin` — the course home.** A "Needs you" strip rendered only when something truly needs her (pending join requests with inline Approve and Decline; an unread-messages line; a listed course with zero modules; a content nudge for any module releasing within 7 days that is missing videos, slides, exercises or solutions), then a card per course, then a dashed New course card (`/admin/courses/new`).
- **`/admin/courses/[id]`** — tabs: **Modules** (the week rail in jade/blue/linen with per-row completeness and submitted counts, and an inline "Add week N" composer with the week autofilled), **Students** (this course's enrollments, Pause / End, add a student), **Progress** (the matrix scoped to the course), **Details** (blurb, listed, subject, level, exam year).
- **`/admin/courses/[id]/weeks/[moduleId]` — the week editor.** Four labeled slots: **Videos** (multi-file with drag to reorder and per-file remove, plus a paste field for a link video with its limits stated beside it), and **Slides / Exercises / Solutions** (one PDF each, with Replace; the solutions slot carries the lock note). Beside them: the "Ready for Monday?" checklist with its one-line summary, the autosaving weekly note, the week details (week number, title, dd/mm/yyyy release day at a fixed 09:00 Athens) and "Preview as a student".
- **`/admin/students`** — name/email, username, per-course enrollments (Pause / Resume / End, add-to-course) each with "submitted x of y released" + a small jade bar, global active toggle, last seen, password reset (actions stacked so nothing truncates); account creation (the chosen cohort becomes the first active enrollment, in one transaction). `?open=` slides a student's drawer open.
- **`/admin/calendar`** — the read-only calendar over every cohort, entries linking to the week editor.
- **`/admin/messages`**, **`/admin/messages/[studentId]`** — every student as a thread by latest activity with unread counts; reply marks the thread read for the tutor (opening alone does not); the nav shows the unread total.
- **`/admin/submissions/[id]`** — a submitted attempt (note + inline image / PDF), served by the admin-only `/api/admin/submissions/[id]/file` (404 to anyone else). Reached from a jade cell in the progress matrix.
- **`/admin/settings`** — `booking_url` (absolute http(s) or empty), `clinic_text` (≤ 2000), `clinic_day`, `clinic_time`.
- **Retired routes** still answer, as redirects: `/admin/modules`, `/admin/requests`, `/admin/progress` and the old `/admin/courses` list all land on `/admin`; `/admin/modules/[id]` looks the module up and lands on its week editor (SPEC §15.7 #23).

## 9. API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/materials/[id]` | GET | student/admin session | material bytes with Rules 1 & 2 enforced; range slices for video (206, or 416 with `Content-Range: bytes */size`); stamped PDF downloads. A link video has no bytes here and 404s |
| `/api/submissions` | POST | student session | submit an attempt (file/note/bare); 409 on duplicates |
| `/api/events` | POST | student session | video-progress capture |
| `/api/admin/materials` | POST | admin session | slot upload → `storage/` + materials row, or a validated pasted video link → `external_url`; the single-file slots replace in place |
| `/api/admin/submissions/[id]/file` | GET | admin session (404 otherwise) | a submitted file, inline, `private, no-store` |

Everything else is server components + server actions (`app/login/actions.ts`, `app/app/actions.ts`, `app/admin/actions.ts`, `lib/auth-actions.ts`); forms with inline errors use `useActionState` and `revalidatePath` rather than redirects. Every id from params/forms is shape-checked (`lib/validate.ts`) before touching a uuid column.

## 10. Files, video, stamping

- **Everything is self-hosted** (SPEC §15.7 #25). Storage keys are server-generated (`modules/{moduleId}/{sha1-stem}{ext}`, `submissions/{userId}/{moduleId}-{random}{ext}`) and every key is normalised against traversal before it touches the filesystem. A 24-week course of short videos is roughly 15 to 30 GB, so `storage/` needs a sized volume and must be backed up alongside Postgres.
- **Serving is production grade.** `storage.getRange` streams `[start, end]` from a file offset, so the `bytes=0-` a browser opens with costs one small buffer rather than the whole recording. `lib/range.ts` (pure, tested) resolves the Range header: a slice, the whole object, or 416 with `Content-Range: bytes */size` for anything malformed or unsatisfiable, including junk, the wrong unit, a multi-range request and a start past the end. `Accept-Ranges` is honest per type: `bytes` for inline video, `none` for everything else, because a stamped PDF download is generated per request and its bytes are not the stored bytes.
- **Link videos.** Per video, the tutor can paste a URL instead of uploading. It is validated exactly like `booking_url` through the shared `httpUrlOrNull` (absolute http(s) with a hostname), so no `javascript:` value can reach an href or an iframe src. `lib/video.ts` derives the embed URL for YouTube (via youtube-nocookie), Loom and Google Drive, and returns none for any other host, which the student page renders as an "Open video" step rather than an iframe that may quietly refuse to load. The cost is stated in the admin next to the field: the video plays outside the login wall, cannot be paused with a student, and reports no watch position back.
- **Stamping.** Every student PDF download is stamped "Road to Success · Prepared for {name} · {email}" on each page (`lib/stamp.ts`, bundled Noto Sans for Greek; encrypted PDFs are returned untouched).

## 11. Design system (`DESIGN.md`)

Dimitra's palette: blue `#0061ef` (nav, links, selected, primary buttons), indigo `#3b197f` (headings, hero), orange `#f47d31` (exactly one motivational CTA per view, ink text), jade `#00a86b` fills with forest `#1e7a4a` text, cream page, white cards — no yellow, and since the M10 audit no other hex at all (tints are alpha of brand colours; the hero is solid indigo; error red `#c4320a` is the sole functional exception). Plus Jakarta Sans, vendored under OFL and self-hosted (SPEC §15.7 #26); inline SVG icons. The Phase 1 direction (Apercu, Material Symbols, sunbeam) is superseded and mapped in DESIGN.md §10. The M9 walk audited every student and admin route at 390px and 1280px: no horizontal scroll, no sunbeam in any computed style, green text only in forest, orange backgrounds only with ink text and at most one per view, no icon-font remnants.

## 12. Quality status

- **Checks at HEAD:** TypeScript strict clean, ESLint clean, **182/182 tests**, `next build` green with no network at any stage (the font files are in the repo).
- **Tests cover:** the gating rules (every enrollment status, release edge, paused), the hero tie-break, timezone math including the dd/mm/yyyy release helpers, the calendar month builder (grid frame, Athens release days, weekly clinic, agenda, junk month params), module completeness and the nudge copy, the 0005 backfill replayed on real SQL, DB-backed queries (two-course / requested / paused-one-course / catalog / assignments), messages authorization (forged student id, paused actor, student vs admin paths, unread transitions), settings rules + persistence + authz, own-password change + session revocation, admin-only submission read, content types, **HTTP Range parsing** (every satisfiable form and fourteen refused ones), **storage slice reads** (the offset stream is used and `readFile` is not, slices match, traversal is contained), **video-link validation and embed derivation**, PDF stamping including Greek, password hashing, lockout, uuid validation. Every DB-backed `beforeAll` and the migration replay carry explicit 30s timeouts.
- **Walks:** each milestone's SPEC §15.6 checklist was walked in headless Chrome at 390px and 1280px against the seeded dev database (log in per seeded user, assert `innerText`, audit every computed colour against the palette whitelist, screenshot). The go-live round added an HTTP-level range walk: a 5 MB upload, a real student session, 17 Range cases, every 206 body compared byte for byte with the stored slice.
- **Known limitations:** seeded videos are absent unless generated (`scripts/make-seed-videos.mjs`), so the seeded video rows 404 until then. Nothing reads the `events` table yet. Content and infrastructure items (photo, contact email, credential claims, domain, host, disk sizing, backups and the restore rehearsal) are in `LAUNCH.md`.

## 13. Repo map

```
SPEC.md  DESIGN.md  CLAUDE.md  LAUNCH.md   # sources of truth + the launch checklist
PROJECT_REPORT.md                           # this report
design/                                     # road-to-success-mockup.html (brand), admin-blend-final.html (M11),
                                            #   student-direction-2-course-hub.html (M12), lumen-dashboard-mockup.html
                                            #   (the M9 palette reference), extracted/ (Phase 1 sources)
docs/superpowers/plans/                     # per-milestone implementation plans (M6–M12)
db/                                         # schema.ts, migrations/ (0000–0007), seed-data.ts, migrate.test.ts
lib/                                        # gating, access, current, queries, admin-queries, content, calendar,
                                            #   messages(+rules), settings(+rules), account, submissions, brand,
                                            #   auth, password(+rules), lockout, storage, range, video, stamp,
                                            #   content-type, tz, format, validate, testing/memory-db
app/                                        # / (landing) · /login · /app/* (student) · /admin/* (tutor) · /api/*
components/rts/                             # icon (SVG), core (primitives), learning (rows, panels, cards),
                                            #   forms, calendar-view
components/app/  components/admin/  components/messages/
scripts/ensure-dev-db.ts                    # predev bootstrap (embedded DB, migrate, seed)
assets/fonts/                               # Noto Sans for PDF stamping · plus-jakarta-sans/ for the UI (both OFL)
storage/                                    # uploaded videos, PDFs and submitted attempts (gitignored)
proxy.ts                                    # cookie-presence gate (Next 16 proxy convention)
```
