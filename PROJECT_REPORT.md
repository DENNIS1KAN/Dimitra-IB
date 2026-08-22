# Lumen — Project Report

*A complete technical report on what has been built and how it works. Written to be handed to an AI assistant (or a new developer) as full project context. State of the codebase as of 2026-08-22, after a full adversarial code review, a fix pass (30 confirmed findings resolved), and an owner-directed auth change (magic links replaced by username + password).*

---

## 1. What Lumen is

Lumen (working title) is a **private learning platform for one IB tutor, Dimitra**. Her 1:1 chemistry students move to weekly pre-recorded modules — videos, slides, exercise sets — with worked solutions gated behind a submitted attempt. Payment happens offline (PayPal); the platform mirrors it with a single per-student toggle.

- **Scale:** 10–30 students, one admin (the tutor), one tenant. Deliberately small and boring.
- **Sources of truth in the repo:** `SPEC.md` (scope/behavior), `DESIGN.md` (visual tokens + component recipes), `CLAUDE.md` (working rules). SPEC §5's three gating rules are *the entire business logic*.
- **Audience note:** students are mostly minors; the app stores minimal PII (name, email, cohort — nothing else) and is meant to deploy EU-only.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.3.2 (App Router, Turbopack), TypeScript strict, single monolith |
| Database | Postgres + Drizzle ORM 0.45.2 with SQL migrations. Dev default: **embedded Postgres (PGlite 0.5.5)** in `./pgdata-lite` — zero external processes. Optional real Postgres 16 via Docker (`docker-compose.yml` + `.env`). Production requires `DATABASE_URL` (the app refuses PGlite in production). |
| Styling | Tailwind 4 + a small in-repo design system (`components/lumen/`) built from `DESIGN.md` tokens |
| Auth | Username + password (scrypt hashes via `lib/password.ts`) + hashed server-side sessions — no auth library, no email service |
| Files | One `FileStorage` interface: local `./storage` folder in dev, Bunny Storage in production |
| Video | Local `<video>` streaming in dev; Bunny Stream signed embeds in production (upload wiring deferred — see §11) |
| PDF stamping | pdf-lib + @pdf-lib/fontkit with a bundled Noto Sans (Greek-capable) |
| Tests | Vitest — 33 unit tests over the gating rules, timezone math, Bunny token math, PDF stamping, and password hashing |

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
| Admin (tutor) | `dimitra` | full admin panel |
| Student | `nikos` | active, already submitted week 5 |
| Student | `eleni` | active, nothing submitted |
| Student | `petros` | **paused** → sees the Rule 3 screen |

Sign-in: username + password on `/login`.

Other commands: `npm run build` / `start` (production), `npm run db:generate` (new migration from schema), `npm run db:migrate`, `npm run db:seed` (wipe + reseed; stop the dev server first — the embedded DB is single-process and a second opener is refused; reseeding a non-empty `DATABASE_URL` database requires `npm run db:seed -- --force`), `npm test`, `npm run typecheck`, `npm run lint`.

## 4. The business logic — two levers, three rules (SPEC §5)

The tutor controls access with exactly two levers:

- **Lever 1 — `users.active`:** she pauses a student who hasn't paid, unpauses when they do.
- **Lever 2 — `modules.release_date`:** weekly unlocks happen automatically on schedule.

Three rules, implemented as pure functions in `lib/gating.ts` and unit-tested:

1. **Module visibility** (`moduleState(module, student, now)` → `"open" | "locked-teaser" | "invisible"`): a module is **open** iff same cohort AND `release_date <= now` AND the student is active. Future modules in the student's cohort render as **locked teasers** ("Unlocks {date}"). Other cohorts' modules are **invisible** — never rendered, even by direct URL (pages 404).
2. **Solutions gating** (`solutionsVisible(hasSubmission)`): materials of type `solutions` stay hidden until the student has *any* submission for that module (a file, a note, or a bare "I attempted this" all count). The same fact marks the module complete.
3. **Paused behavior** (`isPaused`): an inactive student sees only a friendly full-screen "Your access is paused" state. No lists, no content; data preserved; unpausing restores everything instantly.

**Enforcement is server-side everywhere**: every student page *and* every byte-serving API route re-derives these rules per request (queries additionally filter by cohort in SQL, so foreign modules never leave the database layer). A verified review specifically hunted for bypasses (direct storage keys, ID enumeration, solutions via direct URL, unreleased-module metadata leaks) and found none.

## 5. Data model (`db/schema.ts`, 7 tables)

- **`cohorts`** — name, subject, level (HL/SL), exam year.
- **`users`** — role (`admin`/`student`), name, `username` (unique, login identity), `password_hash` (scrypt), email (unique — contact + PDF stamping only, no auth role), `cohort_id`, `active` flag (Lever 1), `last_seen_at` (stamped on sign-in, refreshed on activity), `created_at`.
- **`modules`** — cohort, week number (unique per cohort), title, description ("your weekly note to students"), `release_date` (Lever 2).
- **`materials`** — module, type (`video`/`slides`/`exercises`/`solutions`), title, `storage_key`, sort order.
- **`submissions`** — student × module (unique pair), optional uploaded file key, optional note, timestamp.
- **`events`** — **write-only analytics** in V1: `view`, `download`, `video_progress` (every 30s from the player). Parent digests / clinic briefs build on this later.
- **`sessions`** — SHA-256 hash of the session token, 30-day expiry.

Deletion cascades are wired so account deletion = delete the user row (+ remove `storage/submissions/{userId}/`).

## 6. Authentication — how sign-in works

Username + password, hand-rolled and minimal (an owner-directed substitution recorded in SPEC §7/§9 — the original spec said magic links; there is now **no email service anywhere**):

1. `/login` shows a username + password form. The server action (`app/login/actions.ts`) looks up the username, verifies the password against a per-user salted **scrypt** hash (`lib/password.ts`, node:crypto — no extra dependency, timing-safe compare), and verifies against a dummy hash when the username is unknown so response timing is uniform (no username enumeration).
2. On success a session row is created (only the SHA-256 hash of the 32-byte session token is stored, 30-day expiry) and the cookie is set: `httpOnly`, `SameSite=Lax`, `Secure` in production, `path=/`. Wrong credentials → one generic "Wrong username or password" message.
3. Sign-out deletes the session row and the cookie. `getSessionUser()` re-reads the user row on every request, so pausing a student cuts them off instantly.

**Account management (no self-service):** the tutor creates each account in `/admin` — name, username, initial password (typed in the form, min 8 chars; nothing secret ever rides in a URL), contact email, cohort — and hands the credentials to the student herself. Each student row has an inline "Set password" reset form. Passwords are stored only as `scrypt:{salt}:{hash}`. Existing rows migrated before this change carry an unverifiable `locked` placeholder until a password is set.

**Authorization:** a root `proxy.ts` (Next 16's renamed middleware) does a cookie-presence gate for `/app/*` and `/admin/*`; the real checks live deeper — every admin page and server action calls `requireAdmin()`, and every student surface re-derives gating. Defense in depth: neither the proxy nor the layouts are load-bearing for security.

## 7. Student experience (`app/app/*`, mobile-first at 390px)

- **`/app`** — module list for the student's cohort: open modules, locked teasers with unlock dates, completion state (has a submission). Paused students see only the Rule 3 screen.
- **`/app/modules/[id]`** — one module: the tutor's weekly note, materials list (videos link to the watch page; slides/exercises view inline or download), the submission form, and the solutions panel (locked until an attempt is submitted, with "Submit your attempt to unlock solutions").
- **`/app/modules/[id]/watch/[materialId]`** — video player page. Dev: local `<video>` streaming from `/api/materials/{id}` with proper byte-range support. Prod (Bunny configured): a signed Bunny Stream embed. Logs one `view` event per visit and `video_progress` every 30 seconds (fire-and-forget; can never break playback).
- **Submissions** — a photo/PDF upload (25MB cap, extension whitelist), a note, or a bare "mark attempted"; unique per student × module, enforced by DB index with a friendly 409 on races; files are stored under per-attempt keys so nothing can be overwritten, and are **write-only** (never served back — no IDOR surface).
- **Downloads** — every PDF a student downloads is stamped on each page: *"Prepared for {name} · {email}"* (see §10).

Desktop is a responsive layout of the same routes, not separate pages. All UI comes from `DESIGN.md` tokens via `components/lumen/`.

## 8. Admin experience (`app/admin/*` — "function over beauty", SPEC §12)

- **`/admin`** — students table: name + contact email, username, cohort, active toggle (Lever 1 — one click pauses/unpauses), honest "last seen" (survives sign-out; reflects activity), inline password-reset per row; plus account creation and cohort creation forms.
- **`/admin/modules`** — modules grouped by cohort; create form (cohort, week number, release date-time, title, description). Week-taken conflicts (unique per cohort) return a friendly banner **and preserve everything typed**.
- **`/admin/modules/[id]`** — edit module details; drag-and-drop material upload (`components/admin/upload-dropzone.tsx` → `/api/admin/materials`); rename, reorder (self-healing renumber in a transaction), and delete materials (with a confirmation dialog — delete removes the DB row, the stored file, and cascades event history).
- **Progress matrix** — per-student × per-module completion, built from submissions.
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

Everything else is server components + server actions (sign-in, sign-out, all admin mutations). All ID inputs are shape-validated (`lib/validate.ts` `isUuid`) before touching uuid columns — malformed IDs return clean 404/400s.

## 13. Dev database bootstrap (`scripts/ensure-dev-db.ts`)

Runs as `predev` before every `npm run dev`:

- **No `DATABASE_URL`:** opens embedded PGlite, applies migrations, seeds only if the users table is empty. Zero-config first run.
- **`DATABASE_URL` set:** prints one line and exits **without connecting** — `npm run dev` never migrates, seeds, or aborts against a real database. Migrating/seeding stay explicit (`db:migrate` / `db:seed`; wiping a non-empty real database requires `--force`).
- Env files are loaded with `@next/env` (the loader Next itself uses), so the script and the app always agree on `.env` / `.env.local` precedence.
- PGlite is single-process; a pidfile guard (`pgdata-lite/.owner.pid`, liveness-checked, stale-safe) makes any second opener refuse with instructions instead of silently corrupting the data directory.
- `db/index.ts` initializes lazily (a Proxy over the driver), so `npm run build` works with no env at all; in production a missing `DATABASE_URL` fails fast at first use with a clear message. `Db` is typed as the driver-agnostic `PgDatabase` both backends genuinely satisfy; `getDbDriver()` exposes the concrete driver where needed (migrators).
- Seed data anchors weekly releases to the **most recent Monday 09:00 in the tutor's timezone** (`mostRecentMondayAt` in `lib/tz.ts`, boundary/DST-tested): 2 released modules, 2 future teasers, plus a second cohort whose module must never render for the main cohort — so every SPEC checklist item can actually be walked.

## 14. Quality status & history

- **Checks:** TypeScript strict clean, ESLint clean, **33/33 unit tests pass** (gating rules incl. exact-release-time and paused edges, timezone round-trips + DST, Monday-anchor boundaries, Bunny token formulas, PDF stamping incl. Greek names and fail-open, password hashing round-trips). `npm run build` passes with zero env vars.
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
db/                                    # schema.ts, migrations/, seed-data.ts
lib/                                   # gating, auth, password, storage, video, stamp, tz, queries, validate
app/                                   # / (landing) · /login
                                       # /app/* (student) · /admin/* (tutor) · /api/*
components/lumen/                      # design system from DESIGN.md recipes
components/app/  components/admin/     # feature components (player, dropzone, confirm)
scripts/ensure-dev-db.ts               # predev bootstrap (embedded DB, migrate, seed)
assets/fonts/                          # bundled Noto Sans (OFL) for PDF stamping
proxy.ts                               # cookie-presence gate (Next 16 proxy convention)
storage/  pgdata-lite/                 # dev files + embedded DB (both gitignored)
```
