# Lumen — V1 Build Specification

**Status:** Ready to build · **Working title:** Lumen · **Last updated:** 2026-08-21

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
- **In-app messaging** — she already has these students on WhatsApp; caps and inbox UI come later.
- **Session booking** — a Calendly link covers it.
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

---

## 6. Data model

Postgres. Six domain tables plus whatever the auth library needs.

**users** — `id`, `role` (`admin` | `student`), `name`, `email` (unique), `cohort_id` (nullable for admins), `active` (bool, default true), `created_at`

**cohorts** — `id`, `name` (e.g. "Chemistry HL 2027"), `subject`, `level` (`HL` | `SL`), `exam_year`

**modules** — `id`, `cohort_id`, `week_number` (int), `title`, `description` (short), `release_date` (timestamptz)

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

**Student** (mobile-first — assume a phone)
- `/app` — modules grouped by week: completed (check), open, locked teaser with unlock date. Progress bar: completed ÷ released.
- `/app/modules/[id]` — videos (embedded player), slides (inline view + download), exercises (download), submit box (file and/or note and/or "mark attempted"), solutions section (locked until submission per Rule 2).

**Admin** (function over beauty — she is the only viewer)
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

One milestone per session. Verify each checklist before starting the next. Milestones 1–2 require **zero external accounts**.

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

Parent monthly digest email (built from `events` + `submissions`) · clinic auto-briefs (most-missed questions per cohort per week) · in-app messaging with per-plan caps · 1:1 booking · per-student video watermarking · payments/subscriptions · multi-tutor tenancy.

---

## 14. Open questions

- **Name & domain** — "Lumen" is a working title; confirm before the landing page ships (non-blocking until M5). *Owner: tutor + developer.*
- **Vendor account ownership** — Bunny/Resend/domain should live under the tutor's accounts for continuity; developer gets access. *Owner: both. Non-blocking until M3.*
- **Slides inline viewer vs download-only** — default: inline browser view + stamped download; confirm she's happy exercises are download-only. *Owner: tutor. Non-blocking.*
- **Greek copy for parents on the landing page** — default English-only in V1. *Owner: tutor. Non-blocking.*
