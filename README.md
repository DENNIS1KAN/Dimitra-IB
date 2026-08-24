# Road to Success

**by Anglou Dimitra** · formerly the working title Lumen; renamed 2026-08-24 (SPEC §15.7 #20).

A private learning platform for one IB tutor. Students get weekly
pre-recorded modules (videos, slides, exercises); worked solutions unlock
only after they submit an attempt; access mirrors offline PayPal payments
through one active/paused toggle per student plus per-module release dates.

- **SPEC.md** — authoritative for scope and behavior (the three gating rules
  in §5 are the entire business logic).
- **DESIGN.md** — authoritative for visuals (Dimitra's palette, tokens and
  component recipes; `design/road-to-success-mockup.html` is the brand
  reference, `design/lumen-dashboard-mockup.html` the dashboard one).
- **LAUNCH.md** — what stands between HEAD and real students, split by owner.
- **CLAUDE.md** — standing working rules for AI-assisted development.

## Quick start — only Node.js needed

```bash
git clone https://github.com/DENNIS1KAN/Dimitra-IB
cd Dimitra-IB
npm install
npm run dev                   # → http://localhost:3000
```

That's the whole setup: with no `DATABASE_URL` configured, `npm run dev`
boots an **embedded Postgres** (PGlite, persisted in `./pgdata-lite`),
migrates it, and seeds the demo data automatically. No Docker, no `.env`.

> `package.json` pins exact versions (no lockfile in the repo — it couldn't
> travel this workspace's API-based push path); `npm install` regenerates a
> local `package-lock.json` on first run.

**Sign in:** username + password on `/login`. Every seeded account uses the
password **`success123`**.

<details>
<summary><strong>Prefer real Postgres 16 (matches production)?</strong></summary>

```bash
docker compose up -d          # or any Postgres 16
cp .env.example .env          # sets DATABASE_URL
npm run db:migrate
npm run db:seed
npm run dev
```

With `DATABASE_URL` set, `npm run dev` leaves your database alone —
migrating and seeding stay explicit commands (`db:migrate` / `db:seed`;
reseeding a non-empty database needs `npm run db:seed -- --force`).

The embedded database is dev-only — production requires `DATABASE_URL`
(the app refuses to use PGlite in production).
</details>

| Account | Username | Password | State |
|---|---|---|---|
| Admin (tutor) | `dimitra` | `success123` | full admin panel; one pending join request to approve |
| Student | `nikos` | `success123` | Chemistry HL (active), week 5 submitted; has **asked to join** Chemistry SL |
| Student | `eleni` | `success123` | Chemistry HL **and** SL (two courses); week 5 not submitted yet |
| Student | `petros` | `success123` | **paused** globally → sees the Rule 3 screen |

A fourth, listed course (Mathematics AA SL 2027, no modules yet) sits in the catalog so "Ask to join" can be tried.

Optional extra:

```bash
# real 5s WebM clips for the seeded videos (needs a Chromium binary):
node scripts/make-seed-videos.mjs /path/to/chromium
```

Without it the player shows a friendly "still processing" note. Type is
Plus Jakarta Sans via a stylesheet link (system fallback offline); icons are
inline SVGs — there are no font or icon files to install.

> Keep the checkout **outside iCloud-synced folders** (Desktop/Documents with
> "Optimize Mac Storage"): evicted `node_modules` and `pgdata-lite` files stall
> the toolchain for minutes per read.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | production build / serve |
| `npm run db:generate` | generate a migration from `db/schema.ts` |
| `npm run db:migrate` | apply migrations |
| `npm run db:seed` | reset + seed demo data (writes placeholder PDFs to `./storage`) — stop `npm run dev` first (the embedded DB is single-process; a second opener is refused); a non-empty `DATABASE_URL` database additionally requires `npm run db:seed -- --force` |
| `npm test` | vitest — gating rules, hero tie-break, timezone math (incl. the dd/mm/yyyy release helpers), the calendar month builder, the enrollments backfill migration, DB-backed query / messages-authorization / settings / own-password / submission-read tests (in-memory PGlite), video-link validation and embeds, HTTP Range parsing, storage slice reads, stamping, auth |
| `npm run typecheck` / `lint` | TypeScript strict / ESLint |

## How it hangs together

- `lib/gating.ts` — Rules 1–3 as pure functions (Rule 1 is enrollment-based
  since Phase 2 — SPEC §15.2; deadlines were removed again in M10, §15.7 #16);
  **every** access decision (pages *and* the material-bytes API) goes
  through them. `lib/access.ts` loads a student's enrollments per request.
  Unit-tested, plus DB-backed query tests on an in-memory PGlite.
- `db/schema.ts` — the six SPEC §6 tables + `sessions`, plus the Phase 2
  tables (`enrollments`, `messages`, `settings`) and fields (cohort `blurb` /
  `is_listed`). Migration 0005 backfilled one active
  enrollment per old `users.cohort_id` before dropping that column.
- `lib/auth.ts` — hashed server-side sessions; `lib/password.ts` — scrypt
  password hashing. Sign-in is username + password; the tutor creates
  accounts and resets passwords in `/admin`; students change their own on
  `/app/account` (`lib/account.ts` — a change signs out their other
  devices). No email service anywhere.
- `lib/storage.ts` — one `FileStorage` interface with one implementation:
  this server's own `storage/` folder, in dev and in production (SPEC §15.7
  #25). `getRange` streams `[start, end]` from a file offset, so a seek into a
  large video costs one buffer rather than the file.
- `lib/range.ts` — HTTP Range parsing for the material bytes route: a slice,
  the whole object, or 416 with `Content-Range: bytes */size` for anything
  malformed or unsatisfiable. Pure and tested.
- `lib/video.ts` — pasted video links: `booking_url`-grade URL validation plus
  the embed URL for YouTube, Loom and Google Drive. Anything else becomes an
  "Open video" step. Pure and tested.
- `lib/stamp.ts` — every student PDF download gets "Prepared for {name} ·
  {email}" stamped on each page (pdf-lib).
- `app/app/*` — student screens (mobile-first, 390px-checked, per DESIGN.md):
  `/app` My courses (one card per enrollment + the catalog with "Ask to
  join"), `/app/courses/[id]` (the weekly note + that course's week rail),
  `/app/messages` (one thread with Dimitra, polling refresh), `/app/schedule`
  (read-only month grid / 390px agenda: releases + the weekly clinic marker
  from `clinic_day`/`clinic_time`, plus the "Book a 1:1 on Google Meet"
  link-out), `/app/account` (change own password), module and watch pages.
  The M11/M12 rebuild retired `/app/courses`, `/app/assignments`,
  `/app/sessions` and `/app/calendar`; they redirect (SPEC §15.7 #24).
- `lib/messages.ts` — the only reader/writer of `messages`; every function
  takes the acting user and derives the thread from it (a forged student id
  in a POST is ignored — tested), so student A can never read or write B's
  thread. Body rule: trimmed, non-empty, ≤ 4000 characters.
- `app/admin/*` — `/admin` is the course home (the "Needs you" strip + course
  cards); `/admin/courses/[id]` has the Modules / Students / Progress /
  Details tabs; the week editor at `/admin/courses/[id]/weeks/[moduleId]` has
  the four slots (Videos take uploads *or* a pasted link, Slides / Exercises /
  Solutions take one PDF with Replace), the "Ready for Monday?" checklist and
  the autosaving note. The release day is dd/mm/yyyy text and always unlocks
  at 09:00 Athens. Plus `/admin/students` (create/pause/reset password,
  enrollments, the drawer), `/admin/calendar` (all cohorts), the progress
  matrix (a submitted cell opens the attempt, file + note, via the admin-only
  `/api/admin/submissions/[id]/file`), `/admin/messages` (all threads, unread
  counts, reply) and `/admin/settings`. Function over beauty.
- `events` table is **write-only** in V1 (views, downloads, video progress
  every 30s) — parent digests and clinic briefs build on it later.

## Before a real launch (content, not code)

- Replace the initials avatar on `/` with Dimitra's photo (SPEC §7: "tutor
  bio + photo — she is the brand").
- Set the real contact email on the landing page (currently a placeholder
  `mailto:hello@example.com`).
- Confirm the credential claims on the landing page with Dimitra — they come
  from the approved mockups, but they are factual statements on a public page.
- The product name is settled: "Road to Success by Anglou Dimitra" (SPEC
  §15.7 #20). The **domain** is the one identity item still open.
- Set `APP_TIMEZONE` if the tutor ever works outside Europe/Athens — all
  release-date inputs and displayed dates use it.

## Production notes

**The runbook is [DEPLOY.md](DEPLOY.md)**: server prep, DNS, first deploy, the
update procedure, the backup cron line and the restore rehearsal. The
machinery it drives lives in `Dockerfile`, `docker-compose.prod.yml`,
`Caddyfile` and `scripts/{backup,restore,create-admin,migrate,check-env}`.
What follows is the why behind it.

- **Region:** deploy EU-only (Hetzner VPS, or Vercel + Neon EU). Students
  are mostly minors: the app stores name, email, cohort — nothing else.
- **Env:** see `.env.example`; set `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`,
  `APP_TIMEZONE`. There are no vendor keys: no email service, and no media
  host (SPEC §15.7 #25).
- **Video and files:** everything uploaded lives on the server's disk under
  `storage/` and is served by `/api/materials` behind the login, which
  re-checks Rules 1 and 2 per request. A 24-week course of short videos is
  roughly **15 to 30 GB**, so size the volume for the course and keep
  headroom. On a host with an ephemeral filesystem, mount a real volume.
- **Backups cover Postgres AND `storage/`.** Either alone restores to a
  broken platform, so `scripts/backup.sh` puts both in one nightly archive
  (`backups/rts-YYYYMMDD.tar.gz`, newest 14 kept) and `scripts/restore.sh`
  puts both back, into a separate compose project by default so a rehearsal
  cannot touch the live site. The rehearsal is only complete once the
  restored instance plays a video and serves a stamped PDF: a database that
  restores while the files do not is exactly what it exists to catch.
  Dimitra's own drive stays the archive of record for her recordings; the
  platform is delivery.
- **Account deletion:** delete the user row (cascades to submissions,
  sessions, events) and remove `storage/submissions/{userId}/`.

## Repo map

```
SPEC.md  DESIGN.md  CLAUDE.md      # the three sources of truth
LAUNCH.md  PROJECT_REPORT.md       # launch checklist · full technical report
design/                            # approved mockup sources (see design/README.md)
db/                                # schema, migrations, seed
lib/                               # gating, auth, storage, video, stamping
app/                               # routes: / (landing), /login,
                                   #   /app (student), /admin (tutor), /api/*
components/rts/                    # the design system, from DESIGN.md recipes
components/app/, components/admin/ # feature components
assets/fonts/                      # vendored OFL fonts (UI type + PDF stamping)
scripts/                           # asset extraction + seed-video generator
storage/                           # uploaded videos, PDFs and submissions (gitignored)
```
