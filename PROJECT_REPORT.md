# Road to Success: Project Report

*A complete technical report on what has been built and how it works, regenerated strictly from the repository at HEAD on 2026-08-22 after Phase 2 (M6–M9), amended 2026-08-24 after the owner-review round M10 (deadlines removed, calendar added, palette audited). Written to be handed to an AI assistant or a new developer as full project context. The remaining work before real students use it is in `LAUNCH.md`.*

---

## 1. What Road to Success is

Road to Success (formerly the working title Lumen; renamed 2026-08-24, SPEC §15.7 #20) is a **private learning platform for one IB tutor, Anglou Dimitra**. Her 1:1 chemistry students move to weekly pre-recorded modules — videos, annotated slides, exercise sets — with worked solutions gated behind a submitted attempt. Payment happens offline (PayPal); the platform mirrors it with one global toggle per student plus, since Phase 2, per-course enrollments.

- **Scale:** 10–30 students, one admin (the tutor), one tenant. Deliberately small and boring.
- **Sources of truth:** `SPEC.md` (scope/behavior; §15 holds the owner's Phase 2 amendments, milestones M6–M10 with their verified checklists, and the decision log §15.7), `DESIGN.md` (Dimitra's palette, tokens, component and screen recipes), `CLAUDE.md` (working rules). The gating rules in `lib/gating.ts` are *the entire business logic*.
- **Audience note:** students are mostly minors; the app stores name, username, email and course membership — nothing else — and is meant to deploy EU-only.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack), TypeScript strict, single monolith |
| Database | Postgres + Drizzle ORM 0.45.2 with SQL migrations (`db/migrations`, 0000–0005). Dev default: **embedded Postgres (PGlite 0.5.5)** in `./pgdata-lite`. Optional real Postgres 16 via `docker-compose.yml` + `.env`. Production requires `DATABASE_URL` (the app refuses PGlite in production). |
| Styling | Tailwind 4 utilities + the in-repo design system (`app/globals.css` tokens/classes, `components/lumen/*`) in Dimitra's palette. Type: Plus Jakarta Sans by stylesheet link. Icons: inline SVG (`components/lumen/icon.tsx`). No font or icon files ship. |
| Auth | Username + password (scrypt via `lib/password.ts`) + hashed server-side sessions (`lib/auth.ts`) + DB-backed lockout (`lib/lockout.ts`). No auth library, no email service. |
| Files | One `FileStorage` interface (`lib/storage.ts`): local `./storage` in dev, Bunny Storage in production |
| Video | Local `<video>` streaming in dev; Bunny Stream signed embeds in production (upload wiring pending — `LAUNCH.md`) |
| PDF stamping | pdf-lib + @pdf-lib/fontkit with a bundled Noto Sans (Greek-capable) |
| Tests | Vitest — 111 tests over pure rules and DB-backed modules (in-memory PGlite) |

A fresh clone needs **only Node.js**: `npm install && npm run dev`.

## 3. How to run it

```bash
npm install
npm run dev          # → http://localhost:3000
```

With no `DATABASE_URL` set, `predev` (`scripts/ensure-dev-db.ts`) boots the embedded PGlite database, applies migrations, and seeds demo data when the users table is empty. No Docker, no `.env`.

Seeded accounts — **the password for every account is `lumen123`**:

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
3. **Rule 3 — Paused behavior** (`isPaused`): `users.active = false` shows only the full-screen "Your access is paused" state on every `/app` route (messages, sessions, account included). Pages that write also return early for a paused actor, because Next renders page segments in parallel with the layout.
4. **No deadlines.** M10 (SPEC §15.7 #16) removed due dates entirely — migration 0006 dropped the column; only the release instant gates anything.

`lib/current.ts` picks "this week's" module: most recent release → course title A–Z → higher week number (SPEC §15.7 #16).

## 5. Data model (`db/schema.ts`, 10 tables)

- **`cohorts`** — name, subject, level (HL/SL), exam year, `blurb`, `is_listed` (catalog).
- **`users`** — role, name, `username` (unique), `password_hash` (scrypt), `failed_logins` + `locked_until`, email (unique; contact + stamping only), `active` (the global switch), `last_seen_at`, `created_at`. *`cohort_id` was removed in M6.*
- **`enrollments`** — student × cohort (unique), `status` `requested | active | paused | ended`, `requested_at`, `decided_at`. Migration 0005 backfilled one active row per old `users.cohort_id` before dropping the column (`db/migrate.test.ts` replays it against real SQL). Lifecycle: student asks → admin approves (active) or declines (row deleted; they may ask again); admin can pause / resume / end; an ended student may ask again.
- **`modules`** — cohort, week number (unique per cohort), title, description (the weekly note), `release_date` (entered as a dd/mm/yyyy day; always 09:00 Europe/Athens — SPEC §15.7 #15; `due_date` was dropped by migration 0006).
- **`materials`** — module, type (`video | slides | exercises | solutions`), title, `storage_key`, sort order.
- **`submissions`** — student × module (unique), optional `file_key`, optional note, timestamp. Write-only for students; admin-only read path.
- **`messages`** — student, sender (`student | tutor`), body (trimmed, ≤ 4000), `created_at`, `read_at`. One thread per student.
- **`settings`** — key/value: `booking_url`, `clinic_text`.
- **`events`** — write-only analytics (`view`, `download`, `video_progress`); nothing reads it yet. No events for messages.
- **`sessions`** — SHA-256 of the token, 30-day expiry.

## 6. Authentication and authorization

- `/login`: username + password → scrypt verify (dummy hash for unknown users; uniform timing) → lockout after 10 failures for 15 minutes (`lib/lockout.ts`) → session cookie (`httpOnly`, `SameSite=Lax`, `Secure` in production).
- The tutor creates accounts and resets passwords in `/admin`; students change their own on `/app/account` (`lib/account.ts` — current + new, min 8; a change deletes their other session rows, SPEC §15.7 #11).
- `proxy.ts` gates `/app/*` and `/admin/*` on cookie presence; the real checks are `requireAdmin()` (`lib/admin.ts`) and `requireStudent()` (`lib/student.ts`) in every page and action, and the data modules re-check the **acting user row**: `lib/messages.ts`, `lib/settings.ts`, `lib/submissions.ts` all take the actor and throw for the wrong role; the student message path ignores any student id sent by the client (tested with a forged id).

## 7. Student experience (`app/app/*`, mobile-first at 390px)

The blue nav bar (`app/app/layout.tsx`, mounted once) carries Home · Courses · Assignments · Messages (unread dot) · Sessions · Calendar · Account (identity is the initials chip alone since M10); under 1024px the links wrap to a scrollable row. Rule 3 lives in this layout.

- **`/app`** — the dashboard per `design/lumen-dashboard-mockup.html`: indigo hero (course names, greeting by the tutor's clock, jade progress), the note from Dimitra (the current module's description), the "This week" feature card with the view's one orange CTA, the clinic strip from `settings.clinic_text`, the term rail (current · older released · locked), footer. With several active courses rows name their course; a single-course student sees one course.
- **`/app/modules/[id]`** — back link, module title, badge row (New this week / course / Attempt sent), LessonRows (videos → watch page; slides inline + stamped download; exercises download), then the solutions block: locked panel whose "Submit my attempt" (the page's orange CTA) opens the bottom sheet (photo/PDF ≤ 25MB, note, or "just mark as attempted"), or the unlocked panel + solutions row.
- **`/app/modules/[id]/watch/[materialId]`** — local `<video>` (dev) or signed Bunny embed; logs a view once and progress every 30s.
- **`/app/courses`** — my courses (active / paused cards) + the catalog of listed cohorts with "Ask to join" → "Requested".
- **`/app/assignments`** — released modules not yet submitted (newest release first), then completed.
- **`/app/messages`** — the single thread with Dimitra: bubbles with tutor-timezone timestamps, composer (server-enforced rule, inline errors), empty state, 15-second polling; opening marks her messages read.
- **`/app/sessions`** — next clinic + "Book a 1:1 on Google Meet" (new tab to `settings.booking_url`); no Calendar API.
- **`/app/account`** — identity + change own password.
- **`/app/calendar`** — read-only month (grid ≥ 641px, agenda at 390px): release days across active courses, the weekly clinic marker from `settings.clinic_day`/`clinic_time`, the clinic note, and "Book a 1:1" from `booking_url` (SPEC §15.7 #18).

## 8. Admin experience (`app/admin/*`, same blue bar with an ADMIN label)

- **`/admin`** — students: name/email, username, per-course enrollments (Pause / Resume / End, add-to-course) each with "submitted x of y released" + a small jade bar, global active toggle, last seen, password reset (actions stacked so nothing truncates); account creation (the chosen cohort becomes the first active enrollment, in one transaction).
- **`/admin/requests`** — join requests: approve / decline (nav shows the pending count).
- **`/admin/courses`** — blurb + catalog listing per cohort, member counts, cohort creation.
- **`/admin/modules`**, **`/admin/modules/[id]`** — modules by cohort with release badges; create/edit (week, dd/mm/yyyy release day with a friendly inline message, fixed 09:00 Athens, title, description); drag-and-drop material upload, rename, reorder, delete.
- **`/admin/progress`** — students × ALL modules from enrollments with colour states (jade submitted · linen released-pending · stone unreleased), row and column totals, sticky header row + student column; a submitted cell links to **`/admin/submissions/[id]`** (note + inline image / PDF) served by the admin-only `/api/admin/submissions/[id]/file` (404 to anyone else).
- **`/admin/calendar`** — the same read-only calendar over every cohort, entries linking to the module editor.
- **`/admin/messages`**, **`/admin/messages/[studentId]`** — every student as a thread by latest activity with unread counts; reply marks the thread read for the tutor (opening alone does not); nav shows the unread total.
- **`/admin/settings`** — `booking_url` (absolute http(s) or empty) and `clinic_text` (≤ 2000).

## 9. API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/materials/[id]` | GET | student/admin session | material bytes with Rules 1 & 2 enforced; byte ranges for video; stamped PDF downloads |
| `/api/submissions` | POST | student session | submit an attempt (file/note/bare); 409 on duplicates |
| `/api/events` | POST | student session | video-progress capture |
| `/api/admin/materials` | POST | admin session | dropzone upload → storage + materials row |
| `/api/admin/submissions/[id]/file` | GET | admin session (404 otherwise) | a submitted file, inline, `private, no-store` |

Everything else is server components + server actions (`app/login/actions.ts`, `app/app/actions.ts`, `app/admin/actions.ts`, `lib/auth-actions.ts`); forms with inline errors use `useActionState` and `revalidatePath` rather than redirects. Every id from params/forms is shape-checked (`lib/validate.ts`) before touching a uuid column.

## 10. Files, video, stamping

- Storage keys are server-generated (`modules/{moduleId}/{sha1-stem}{ext}`, `submissions/{userId}/{moduleId}-{random}{ext}`); the local backend normalises paths against traversal.
- Video: `lib/video.ts` signs Bunny embed URLs (5-minute TTL); `createBunnyVideo()` + `bunnyUploadSignature()` implement the create + TUS handshake but are **not yet wired to the dropzone** (`LAUNCH.md`).
- Every student PDF download is stamped "Prepared for {name} · {email}" on each page (`lib/stamp.ts`, bundled Noto Sans; encrypted PDFs are returned untouched).

## 11. Design system (`DESIGN.md`)

Dimitra's palette: blue `#0061ef` (nav, links, selected, primary buttons), indigo `#3b197f` (headings, hero), orange `#f47d31` (exactly one motivational CTA per view, ink text), jade `#00a86b` fills with forest `#1e7a4a` text, cream page, white cards — no yellow, and since the M10 audit no other hex at all (tints are alpha of brand colours; the hero is solid indigo; error red `#c4320a` is the sole functional exception). Plus Jakarta Sans; inline SVG icons. The Phase 1 direction (Apercu, Material Symbols, sunbeam) is superseded and mapped in DESIGN.md §10. The M9 walk audited every student and admin route at 390px and 1280px: no horizontal scroll, no sunbeam in any computed style, green text only in forest, orange backgrounds only with ink text and at most one per view, no icon-font remnants.

## 12. Quality status

- **Checks at HEAD:** TypeScript strict clean, ESLint clean, **117/117 tests**, `next build` green (no network needed — the font is a runtime stylesheet link).
- **Tests cover:** the gating rules (every enrollment status, release edge, paused), the hero tie-break, timezone math incl. the dd/mm/yyyy release helpers, the calendar month builder (grid frame, Athens release days, weekly clinic, agenda, junk month params), the 0005 backfill replayed on real SQL, DB-backed queries (two-course / requested / paused-one-course / catalog / assignments), messages authorization (forged student id, paused actor, student vs admin paths, unread transitions), settings rules + persistence + authz, own-password change + session revocation, admin-only submission read, content types, Bunny token formulas, PDF stamping (incl. Greek), password hashing, lockout, uuid validation. Every DB-backed `beforeAll` and the migration replay carry explicit 30s timeouts.
- **Walks:** each milestone's SPEC §15.6 checklist was walked in headless Chrome at 390px and 1280px against the seeded dev database (scripts pattern: log in per seeded user, assert `innerText`, screenshot).
- **Known limitations:** Bunny TUS upload wiring and the SPEC M3 incognito-playback check need real credentials; seeded videos are absent unless generated (`scripts/make-seed-videos.mjs`); content items (photo, contact email, credential claims, product name) are listed in `LAUNCH.md`.

## 13. Repo map

```
SPEC.md  DESIGN.md  CLAUDE.md  LAUNCH.md   # sources of truth + the launch checklist
PROJECT_REPORT.md                           # this report
design/                                     # lumen-dashboard-mockup.html (palette reference), extracted/ (Phase 1 sources)
docs/superpowers/plans/                     # per-milestone implementation plans (M6–M10)
db/                                         # schema.ts, migrations/ (0000–0005), seed-data.ts, migrate.test.ts
lib/                                        # gating, access, current, queries, messages(+rules), settings(+rules), account,
                                            # submissions, content-type, auth, password(+rules), lockout, storage, video,
                                            # stamp, tz, format, validate, testing/memory-db
app/                                        # / (landing) · /login · /app/* (student) · /admin/* (tutor) · /api/*
components/lumen/                           # icon (SVG), core (primitives), learning (rows, panels, cards), forms
components/app/  components/admin/  components/messages/
scripts/ensure-dev-db.ts                    # predev bootstrap (embedded DB, migrate, seed)
assets/fonts/                               # bundled Noto Sans for PDF stamping
proxy.ts                                    # cookie-presence gate (Next 16 proxy convention)
```
