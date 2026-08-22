# Lumen — Project Report

*A complete technical report on what has been built and how it works. Written to be handed to an AI assistant (or a new developer) as full project context. State of the codebase as of 2026-08-22, after a full adversarial code review, a fix pass (30 confirmed findings resolved), an owner-directed auth change (magic links replaced by username + password), a follow-up hardening pass (login lockout, zod-backed id validation, expanded test coverage), and **Phase 2 milestones M6** (enrollments + course catalog + soft deadlines) **M7** (one message thread per student) and **M8** (sessions link-out, own password change, admin submission viewer, settings — SPEC §15). M9 (restyle) is next.*

---

## 1. What Lumen is

Lumen (working title) is a **private learning platform for one IB tutor, Dimitra**. Her 1:1 chemistry students move to weekly pre-recorded modules — videos, slides, exercise sets — with worked solutions gated behind a submitted attempt. Payment happens offline (PayPal); the platform mirrors it with a single per-student toggle.

- **Scale:** 10–30 students, one admin (the tutor), one tenant. Deliberately small and boring.
- **Sources of truth in the repo:** `SPEC.md` (scope/behavior — §15 holds the owner's Phase 2 amendments and the M6–M9 milestones), `DESIGN.md` (visual tokens + component recipes), `CLAUDE.md` (working rules). SPEC §5's three gating rules (Rule 1 rewritten enrollment-based in §15.2) are *the entire business logic*.
- **Audience note:** students are mostly minors; the app stores minimal PII (name, email, cohort — nothing else) and is meant to deploy EU-only.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack), TypeScript strict, single monolith |
| Database | Postgres + Drizzle ORM 0.45.2 with SQL migrations. Dev default: **embedded Postgres (PGlite 0.5.5)** in `./pgdata-lite` — zero external processes. Optional real Postgres 16 via Docker (`docker-compose.yml` + `.env`). Production requires `DATABASE_URL` (the app refuses PGlite in production). |
| Styling | Tailwind 4 + a small in-repo design system (`components/lumen/`) built from `DESIGN.md` tokens |
| Auth | Username + password (scrypt hashes via `lib/password.ts`) + hashed server-side sessions + DB-backed brute-force lockout (`lib/lockout.ts`) — no auth library, no email service |
| Files | One `FileStorage` interface: local `./storage` folder in dev, Bunny Storage in production |
| Video | Local `<video>` streaming in dev; Bunny Stream signed embeds in production (upload wiring deferred — see §11) |
| PDF stamping | pdf-lib + @pdf-lib/fontkit with a bundled Noto Sans (Greek-capable) |
| Tests | Vitest — 111 tests (M8 adds settings rules + persistence, own-password change + session revocation, the admin-only submission read, the shared content-type map): the gating rules (enrollment-based Rule 1, soft deadlines), the dashboard hero tie-break, timezone math incl. the Sunday-23:59 due default, the enrollments backfill migration run against real SQL, DB-backed query tests on an in-memory PGlite (two-course / requested / paused / overdue scenarios), the messages authorization (forged student id, paused actor, student-vs-admin paths, unread/read transitions), Bunny token math, PDF stamping (incl. Greek rendering), password hashing, login lockout, id validation |

Every vendor dependency is env-switched; a fresh clone needs **only Node.js** (`npm install && npm run dev`).

## 3. How to run it

```bash
npm install
npm run dev          # → http://localhost:3000
```

With no `DATABASE_URL` set, `predev` (`scripts/ensure-dev-db.ts`) boots the embedded PGlite database, applies migrations, and seeds demo data automatically. No Docker, no `.env`, no email service.

Seeded accounts — **the password for every account is `lumen123`**:

| Account | Username | State |
|---|---|---|
| Admin (tutor) | `dimitra` | full admin panel; one pending join request (nikos → Chemistry SL) |
| Student | `nikos` | Chemistry HL active, week 5 submitted; has asked to join Chemistry SL |
| Student | `eleni` | Chemistry HL **and** SL active (two courses); week 5 overdue |
| Student | `petros` | **paused** globally → sees the Rule 3 screen |

A listed Mathematics AA SL 2027 cohort (no modules) sits in the catalog for "Ask to join".

Sign-in: username + password on `/login`.

Other commands: `npm run build` / `start` (production), `npm run db:generate` (new migration from schema), `npm run db:migrate`, `npm run db:seed` (wipe + reseed; stop the dev server first — the embedded DB is single-process and a second opener is refused; reseeding a non-empty `DATABASE_URL` database requires `npm run db:seed -- --force`), `npm test`, `npm run typecheck`, `npm run lint`.

## 4. The business logic — two levers, three rules (SPEC §5)

The tutor controls access with exactly two levers:

- **Lever 1 — `users.active`:** she pauses a student who hasn't paid, unpauses when they do.
- **Lever 2 — `modules.release_date`:** weekly unlocks happen automatically on schedule.

Three rules, implemented as pure functions in `lib/gating.ts` and unit-tested:

1. **Module visibility** (`moduleState(module, access, now)` → `"open" | "locked-teaser" | "invisible"`): since M6 (SPEC §15.2) a module is **open** iff the student has an **active enrollment** in its cohort AND `release_date <= now` AND `users.active`. Future modules in actively enrolled cohorts render as **locked teasers** ("Unlocks {date}"). Everything else — no enrollment, a *requested* / *paused* / *ended* enrollment, another cohort — is **invisible**: never rendered, 404 by direct URL. A paused *enrollment* hides only that course (the course card says "Paused — talk to Dimitra"); `users.active = false` still hides everything (Rule 3). `lib/access.ts` loads the enrollment list once per request and every consumer passes it in.
   - **Soft deadline** (`isOverdue(dueDate, hasSubmission, now)`, SPEC §15.1): a released module is *overdue* iff it has a due date that has passed and no submission — a badge only; submitting is never blocked and clears it.
2. **Solutions gating** (`solutionsVisible(hasSubmission)`): materials of type `solutions` stay hidden until the student has *any* submission for that module (a file, a note, or a bare "I attempted this" all count). The same fact marks the module complete.
3. **Paused behavior** (`isPaused`): an inactive student sees only a friendly full-screen "Your access is paused" state. No lists, no content; data preserved; unpausing restores everything instantly.

**Enforcement is server-side everywhere**: every student page *and* every byte-serving API route re-derives these rules per request (queries additionally filter by cohort in SQL, so foreign modules never leave the database layer). A verified review specifically hunted for bypasses (direct storage keys, ID enumeration, solutions via direct URL, unreleased-module metadata leaks) and found none.

## 5. Data model (`db/schema.ts`, 10 tables)

- **`cohorts`** — name, subject, level (HL/SL), exam year; Phase 2: `blurb` + `is_listed` (catalog fields — listed cohorts appear on `/app/courses`).
- **`users`** — role (`admin`/`student`), name, `username` (unique, login identity), `password_hash` (scrypt), `failed_logins` + `locked_until` (brute-force lockout state), email (unique — contact + PDF stamping only, no auth role), `active` flag (Lever 1, the global master switch), `last_seen_at` (stamped on sign-in, refreshed on activity), `created_at`. *`cohort_id` was removed in M6 — membership lives in `enrollments`.*
- **`enrollments`** (M6) — student × cohort (unique pair), `status` `requested | active | paused | ended`, `requested_at`, `decided_at`. Migration `0005` created one *active* row per pre-existing `users.cohort_id` (dated to the account's creation) before dropping that column; the backfill is tested against real SQL in `db/migrate.test.ts`. Lifecycle: student asks → `requested` → admin approves (`active`) or declines (row deleted); admin can pause / resume / end; an ended student may ask again.
- **`modules`** — cohort, week number (unique per cohort), title, description ("your weekly note to students"), `release_date` (Lever 2); Phase 2: nullable `due_date` (soft deadline; the admin form defaults it to the Sunday 23:59 after release in the tutor's timezone — `defaultDueLocal` in `lib/tz.ts`).
- **`messages`** (M7) — student, sender (`student`/`tutor`), body (trimmed, ≤ 4000), `created_at`, `read_at`; one thread per student. `read_at` is set on the *tutor's* messages when the student opens the thread and on the *student's* messages when the tutor replies. No events are logged for messages.
- **`settings`** (M8) — key/value rows `booking_url` (absolute `http(s)://` URL or empty) and `clinic_text` (trimmed, ≤ 2000), upserted from `/admin/settings` (`lib/settings.ts`, admin-only writes).
- **`materials`** — module, type (`video`/`slides`/`exercises`/`solutions`), title, `storage_key`, sort order.
- **`submissions`** — student × module (unique pair), optional uploaded file key, optional note, timestamp.
- **`events`** — **write-only analytics** in V1: `view`, `download`, `video_progress` (every 30s from the player). Parent digests / clinic briefs build on this later.
- **`sessions`** — SHA-256 hash of the session token, 30-day expiry.

Deletion cascades are wired so account deletion = delete the user row (+ remove `storage/submissions/{userId}/`).

## 6. Authentication — how sign-in works

Username + password, hand-rolled and minimal (an owner-directed substitution recorded in SPEC §7/§9 — the original spec said magic links; there is now **no email service anywhere**):

1. `/login` shows a username + password form. The server action (`app/login/actions.ts`) looks up the username, verifies the password against a per-user salted **scrypt** hash (`lib/password.ts`, node:crypto — no extra dependency, timing-safe compare), and verifies against a dummy hash when the username is unknown so response timing is uniform (no username enumeration).
2. **Brute-force lockout** (`lib/lockout.ts`, pure and unit-tested; state in `users.failed_logins`/`locked_until` so it survives restarts and works across processes): the 10th consecutive failure locks the account for 15 minutes and resets the counter; success clears both. Responses stay uniform — unknown username, wrong password, and a locked account (even with the correct password) all run the same scrypt verify and get the same generic error, so there is no lock-state or enumeration oracle.
3. On success a session row is created (only the SHA-256 hash of the 32-byte session token is stored, 30-day expiry) and the cookie is set: `httpOnly`, `SameSite=Lax`, `Secure` in production, `path=/`. Wrong credentials → one generic "Wrong username or password" message.
4. Sign-out deletes the session row and the cookie. `getSessionUser()` re-reads the user row on every request, so pausing a student cuts them off instantly.

**Account management (no self-service):** the tutor creates each account in `/admin` — name, username, initial password (typed in the form, min 8 chars; nothing secret ever rides in a URL), contact email, cohort — and hands the credentials to the student herself. Each student row has an inline "Set password" reset form. Passwords are stored only as `scrypt:{salt}:{hash}`. Existing rows migrated before this change carry an unverifiable `locked` placeholder until a password is set.

**Authorization:** a root `proxy.ts` (Next 16's renamed middleware) does a cookie-presence gate for `/app/*` and `/admin/*`; the real checks live deeper — every admin page and server action calls `requireAdmin()`, and every student surface re-derives gating. Defense in depth: neither the proxy nor the layouts are load-bearing for security.

## 7. Student experience (`app/app/*`, mobile-first at 390px)

One header for every width (`app/app/layout.tsx`) carries the student nav — Home · Courses · Assignments (Messages / Sessions / Account arrive with M7/M8) — mounted once; under 1024px the links wrap to a second row.

- **`/app`** — module list across every **active enrollment**: open modules, locked teasers with unlock dates, completion state (has a submission), the hero's due date, and an **Overdue** badge on rows past their due date with no submission. With a single enrollment the page is exactly the V1 layout; with several, rows name their course. The empty hero distinguishes "paused", "request pending", "not enrolled" (with a link to the catalog) and "nothing released yet". Paused students (`users.active = false`) see only the Rule 3 screen.
- **`/app/courses`** (M6) — *My courses* (one card per active/paused enrollment with progress, or "Paused — talk to Dimitra") and the *Catalog* of listed cohorts with **Ask to join** (a plain form → `requestToJoin` server action; the button becomes "Requested"). Only listed cohorts can be requested, even by a tampered POST.
- **`/app/assignments`** (M6) — every open module across enrollments ordered by due date with overdue badges ("what do I owe"), then the completed ones with their sent date.
- **`/app/messages`** (M7) — the student's single thread with Dimitra: sent/received bubbles with tutor-timezone timestamps, a composer (server-enforced: trimmed, non-empty, ≤ 4000; inline error otherwise), the empty state "No messages yet — ask Dimitra anything about your modules.", and a 15-second polling refresh (`router.refresh` while the tab is visible — no websockets). Opening the page marks Dimitra's messages read; the nav's Messages link shows an unread dot (hidden while on the page). Everything is keyed on the session user — `lib/messages.ts` never accepts a student id from a student.
- **`/app/sessions`** (M8) — "Next clinic" (`settings.clinic_text`, or a friendly empty state) and **"Book a 1:1 on Google Meet"**, a plain `<a target="_blank" rel="noopener noreferrer">` to `settings.booking_url` (no Calendar API — SPEC §15.1). Without a URL the button is replaced by "Booking link coming soon…".
- **`/app/account`** (M8) — name / username / email, and **change own password**: current + new (min 8) through the same scrypt path (`lib/account.ts`); a success also deletes the student's *other* session rows (SPEC §15.7 #11), so a lost device is signed out.
- **`/app/modules/[id]`** — one module: the tutor's weekly note, materials list (videos link to the watch page; slides/exercises view inline or download), the submission form, and the solutions panel (locked until an attempt is submitted, with "Submit your attempt to unlock solutions").
- **`/app/modules/[id]/watch/[materialId]`** — video player page. Dev: local `<video>` streaming from `/api/materials/{id}` with proper byte-range support. Prod (Bunny configured): a signed Bunny Stream embed. Logs one `view` event per visit and `video_progress` every 30 seconds (fire-and-forget; can never break playback).
- **Submissions** — a photo/PDF upload (25MB cap, extension whitelist), a note, or a bare "mark attempted"; unique per student × module, enforced by DB index with a friendly 409 on races; files are stored under per-attempt keys so nothing can be overwritten, and are **write-only** (never served back — no IDOR surface).
- **Downloads** — every PDF a student downloads is stamped on each page: *"Prepared for {name} · {email}"* (see §10).

Desktop is a responsive layout of the same routes, not separate pages. All UI comes from `DESIGN.md` tokens via `components/lumen/`.

## 8. Admin experience (`app/admin/*` — "function over beauty", SPEC §12)

- **`/admin`** — students table: name + contact email, username, **courses** (each enrollment with its status and Pause / Resume / End, plus an "Add to course…" select), global active toggle (Lever 1 — one click pauses/unpauses everything), honest "last seen" (survives sign-out; reflects activity), inline password-reset per row; plus the account-creation form (its cohort becomes the first active enrollment, created in one transaction with the user).
- **`/admin/requests`** (M6) — the join-request queue: approve (→ active enrollment) or decline (row deleted; the student may ask again). The nav label shows the pending count.
- **`/admin/courses`** (M6) — per cohort: blurb + "Listed in the student catalog" checkbox, member counts; cohort creation moved here (new courses start unlisted).
- **`/admin/modules`** — modules grouped by cohort with release and due badges; create form (cohort, week number, release date-time, **due date** — a client pair `components/admin/release-due-fields.tsx` pre-fills the due date with the Sunday 23:59 after release until the tutor edits it; empty = no due date, title, description). Week-taken conflicts (unique per cohort) return a friendly banner **and preserve everything typed**.
- **`/admin/modules/[id]`** — edit module details incl. due date; drag-and-drop material upload (`components/admin/upload-dropzone.tsx` → `/api/admin/materials`); rename, reorder (self-healing renumber in a transaction), and delete materials (with a confirmation dialog — delete removes the DB row, the stored file, and cascades event history).
- **Progress matrix** — per-student × per-module completion, built from submissions; rows come from active + paused enrollments (paused ones marked). Opening a submission from a cell is M8.
- **`/admin/settings`** (M8) — `booking_url` + `clinic_text` with server-side validation (`lib/settings-rules.ts`); saving revalidates `/app/sessions`.
- **Submission viewer** (M8) — a submitted cell in the progress matrix links to `/admin/submissions/[id]`: student, module, sent time, the note, and the file (inline `<img>` for photos, `<iframe>` + new-tab link for PDFs). Bytes come from `/api/admin/submissions/[id]/file`, the **only** read path for submission files: anyone who isn't an admin — students included, even for their own file — gets 404.
- **`/admin/messages`** (M7) — every student as a thread sorted by latest activity (students who never wrote come last so Dimitra can start a thread), with a "n new" badge and the last snippet; the nav shows the unread total. `/admin/messages/[studentId]` shows the thread and a reply composer; **replying** marks that thread read for the tutor (opening alone does not, per SPEC §15.5). Admin-only — `adminThreads` / `adminThread` / `postTutorReply` throw for any non-admin actor.
- All release-date inputs and displayed dates speak the **tutor's timezone** (`APP_TIMEZONE`, default `Europe/Athens`) via `lib/tz.ts`, not the server's — datetime-local round-trips are DST-correct and tested.

## 9. File storage (`lib/storage.ts`)

One interface, two backends, switched purely on env (`BUNNY_STORAGE_ZONE` + `BUNNY_STORAGE_API_KEY`):

```ts
interface FileStorage {
  put(key, data, contentType?)     // persist
  get(key)                         // full read (inline view, stamping)
  size(key)                        // for range requests, no full read
  getRange(key, start, end)        // video seeks read only their slice
  delete(key)
}
```

- **LocalStorage** (dev): `./storage` folder; keys pass through a traversal-safe normalizer (empirically fuzzed during review — `../`, absolute paths, backslashes, null bytes all neutralized). Ranged reads use file-descriptor reads of just the slice.
- **BunnyStorage** (prod): HTTP PUT/GET/HEAD/DELETE with the zone API key; ranged reads via `Range` headers.
- Storage keys are always **server-generated** (`modules/{moduleId}/{sha1-stem}{ext}`, `submissions/{userId}/{moduleId}-{random}{ext}`) — user filenames never reach the filesystem.

## 10. Material serving & PDF stamping

`/api/materials/[id]` is the single bytes endpoint, and it enforces the full access model server-side: 401 unauthenticated → 404 for malformed/unknown IDs → Rule 1 (404 for foreign/unreleased/paused) → Rule 2 (403 for solutions without a submission) → then serves.

- **Videos:** `Accept-Ranges` with real 206 partial responses via `storage.getRange` (a seek never buffers the whole file) and 416 with `Content-Range: bytes */size` for out-of-bounds ranges. `Cache-Control: private, no-store` everywhere.
- **PDF downloads (`?download=1`):** stamped per student via `lib/stamp.ts` — "Prepared for {name} · {email}" on every page, in a bundled Noto Sans (OFL, `assets/fonts/`) registered through fontkit with subset embedding, so **Greek names stamp correctly**. Encrypted PDFs are detected and returned untouched (stamping them corrupts the file). Stamping is fail-open by design: a stamping problem never blocks a download.
- Download/solutions buttons render as plain `<a>` (never `next/link`) so prefetching can't execute the route handler and pollute analytics.
- Events: `view` on inline views, `download` on downloads, logged fire-and-forget; video views are logged once per watch-page visit instead (so range requests don't inflate counts).

## 11. Video in production (Bunny Stream) — current state

- **Playback (implemented):** `lib/video.ts` builds signed embed URLs per Bunny's documented scheme — `sha256(token_key + video_id + expires)` — with a **5-minute TTL**. Bunny's scheme supports no session/IP binding, so the short TTL is what makes a copied embed URL die quickly. Unit-tested against the documented formulas.
- **Upload (deliberately deferred — the known unfinished piece):** `createBunnyVideo()` (create video object → GUID) and `bunnyUploadSignature()` (presigned TUS signature) are implemented and tested but **not yet wired to the admin dropzone**. Today the dropzone stores video bytes through `FileStorage` under path-shaped keys. The watch page therefore guards: it only uses the Bunny embed when the material's storage key looks like a Stream GUID, and falls back to the local player otherwise. Wiring the dropzone to the TUS handshake is the documented M3 finishing step and requires real Bunny credentials (see `README.md` "Production notes").

## 12. API surface (complete)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/materials/[id]` | GET | student/admin session | material bytes; gating enforced; ranges; stamped PDF downloads |
| `/api/submissions` | POST | student session | submit an attempt (file/note/bare), 409 on duplicates |
| `/api/events` | POST | student session | video-progress capture (write-only analytics) |
| `/api/admin/materials` | POST | admin session | dropzone upload → storage + materials row |
| `/api/admin/submissions/[id]/file` | GET | admin session (404 to everyone else) | a submitted file, inline; `private, no-store` |

Everything else is server components + server actions (sign-in, sign-out, all admin mutations, the student's `requestToJoin`, and the message actions `sendMessage` / `replyToStudent`, which use `useActionState` for inline errors and `revalidatePath` instead of redirects). Admin actions go through `requireAdmin()`, student actions through `requireStudent()` (`lib/student.ts`); message actions then delegate to `lib/messages.ts`, which re-checks role/active on the acting user row. All ID inputs are shape-validated (`lib/validate.ts`, zod-backed `isUuid`, unit-tested) before touching uuid columns — malformed IDs return clean 404/400s.

## 13. Dev database bootstrap (`scripts/ensure-dev-db.ts`)

Runs as `predev` before every `npm run dev`:

- **No `DATABASE_URL`:** opens embedded PGlite, applies migrations, seeds only if the users table is empty. Zero-config first run.
- **`DATABASE_URL` set:** prints one line and exits **without connecting** — `npm run dev` never migrates, seeds, or aborts against a real database. Migrating/seeding stay explicit (`db:migrate` / `db:seed`; wiping a non-empty real database requires `--force`).
- Env files are loaded with `@next/env` (the loader Next itself uses), so the script and the app always agree on `.env` / `.env.local` precedence.
- PGlite is single-process; a pidfile guard (`pgdata-lite/.owner.pid`, liveness-checked, stale-safe) makes any second opener refuse with instructions instead of silently corrupting the data directory.
- `db/index.ts` initializes lazily (a Proxy over the driver), so `npm run build` works with no env at all; in production a missing `DATABASE_URL` fails fast at first use with a clear message. `Db` is typed as the driver-agnostic `PgDatabase` both backends genuinely satisfy; `getDbDriver()` exposes the concrete driver where needed (migrators).
- Seed data anchors weekly releases to the **most recent Monday 09:00 in the tutor's timezone** (`mostRecentMondayAt` in `lib/tz.ts`, boundary/DST-tested): 2 released modules, 2 future teasers, plus a second cohort whose module must never render for the main cohort — so every SPEC checklist item can actually be walked.

## 14. Quality status & history

- **Checks:** TypeScript strict clean, ESLint clean, **111/111 tests pass** (M8 added 17: settings rules/persistence/authz, own-password change incl. "old stops working", session revocation keeps the current device, admin-only submission read, content types; every DB-backed `beforeAll` and the migration replay now carry an explicit 30s timeout) (gating rules incl. every enrollment status, exact-release-time and paused edges, the soft-deadline rule; timezone round-trips + DST, Monday-anchor boundaries, the Sunday-23:59 due default; the 0005 backfill migration executed against real SQL; DB-backed query tests on an in-memory PGlite — two-course, requested, paused-one-course, globally paused, overdue-clears-on-submit, catalog/assignments shapes; Bunny token formulas; PDF stamping incl. a test that "Νίκος Καρράς" renders through the embedded NotoSans subset; password hashing round-trips + the dummy-hash timing property + the shared min-8 rule; login-lockout policy; uuid shape validation). `npm run build` passes with zero env vars.
- **M6 verification (2026-08-22):** the SPEC §15.6 checklist was walked in headless Chrome at 390px and 1280px against the seeded dev DB (35 scripted checks): a two-course student sees both courses; a requested course shows no modules; pausing one enrollment hides only that course (direct URL → 404); the overdue badge appears after the due date and clears on submit; a single-enrollment student's dashboard is unchanged from V1; approve/decline, the due-date default, and a tampered "Ask to join" for an unlisted cohort (creates nothing) all behaved.
- **Review:** a full adversarial review (12 finder agents + 9 verifier agents, with empirical reproductions) confirmed 30 findings; **all 30 were fixed** in 14 commits (auth hardening, stamping fixes, uuid guards, ranged serving, admin UX safeguards, the dev-bootstrap rework, docs corrections, and the Next 16 `middleware → proxy` migration). The fixes were then verified end-to-end over HTTP: real sign-in flow, stamped downloads, 206/416 range behavior, cooldown, reseed-guard refusal, and the no-env production build.
- **Verified-clean areas worth knowing:** session tokens hashed at rest; no open redirects; correct cookie flags; CSRF covered by Next's origin checks + Lax cookies; no gating bypasses; storage traversal-safe; no N+1 query patterns; events writes can never surface user-facing errors. (The magic-link findings from the review were fixed and then superseded entirely by the password switch.)

## 15. Known limitations / before a real launch

- **Bunny TUS upload wiring** (§11) — the one unfinished integration; needs real credentials, then SPEC §10 M3's checklist ("upload a real MP4 → it transcodes and plays; incognito embed URL fails").
- Seeded videos are absent by default (the player shows a friendly note); `node scripts/make-seed-videos.mjs /path/to/chromium` generates real 5s clips.
- Content tasks (from README): replace the initials avatar with the tutor's photo, set the real contact email on the landing page, confirm the landing-page credential claims and the product name, set `APP_TIMEZONE` if she ever works outside Europe/Athens.
- Production notes: deploy EU-only; set `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`, Resend + Bunny keys per `.env.example`; managed Postgres backups (restore procedure documented in README).

## 16. Repo map

```
SPEC.md  DESIGN.md  CLAUDE.md          # the three sources of truth
PROJECT_REPORT.md                      # this report
design/                                # approved mockup sources
db/                                    # schema.ts, migrations/ (0005 = enrollments backfill), seed-data.ts, migrate.test.ts
lib/                                   # gating, access, student, messages(+rules), settings(+rules), account, submissions, content-type, auth, password, lockout, storage, video, stamp, tz, queries, validate
lib/testing/memory-db.ts               # in-memory PGlite seam for DB-backed tests
docs/superpowers/plans/                # per-milestone implementation plans
app/                                   # / (landing) · /login
                                       # /app/* (student) · /admin/* (tutor) · /api/*
components/lumen/                      # design system from DESIGN.md recipes
components/app/  components/admin/     # feature components (student nav, player, dropzone, confirm, release+due fields)
components/messages/                   # bubbles, composer (useActionState), auto-refresh polling
scripts/ensure-dev-db.ts               # predev bootstrap (embedded DB, migrate, seed)
assets/fonts/                          # bundled Noto Sans (OFL) for PDF stamping
proxy.ts                               # cookie-presence gate (Next 16 proxy convention)
storage/  pgdata-lite/                 # dev files + embedded DB (both gitignored)
```
