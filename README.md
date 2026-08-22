# Lumen (working title)

A private learning platform for one IB tutor. Students get weekly
pre-recorded modules (videos, slides, exercises); worked solutions unlock
only after they submit an attempt; access mirrors offline PayPal payments
through one active/paused toggle per student plus per-module release dates.

- **SPEC.md** — authoritative for scope and behavior (the three gating rules
  in §5 are the entire business logic).
- **DESIGN.md** — authoritative for visuals (tokens + component recipes
  extracted from the approved mockups in `design/`).
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
password **`lumen123`**.

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
| Admin (tutor) | `dimitra` | `lumen123` | full admin panel; one pending join request to approve |
| Student | `nikos` | `lumen123` | Chemistry HL (active), week 5 submitted; has **asked to join** Chemistry SL |
| Student | `eleni` | `lumen123` | Chemistry HL **and** SL (two courses); week 5 is overdue |
| Student | `petros` | `lumen123` | **paused** globally → sees the Rule 3 screen |

A fourth, listed course (Mathematics AA SL 2027, no modules yet) sits in the catalog so "Ask to join" can be tried.

Optional extras:

```bash
# real 5s WebM clips for the seeded videos (needs a Chromium binary):
node scripts/make-seed-videos.mjs /path/to/chromium

# licensed Apercu Pro fonts + original mockup export (gitignored — this repo
# is public; see design/README.md):
node scripts/extract-design-assets.mjs /path/to/Lumen_UI_Mockups_standalone.html
```

Without the font step the app renders on its system fallback stack; without
the video step the player shows a friendly "still processing" note.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | production build / serve |
| `npm run db:generate` | generate a migration from `db/schema.ts` |
| `npm run db:migrate` | apply migrations |
| `npm run db:seed` | reset + seed demo data (writes placeholder PDFs to `./storage`) — stop `npm run dev` first (the embedded DB is single-process; a second opener is refused); a non-empty `DATABASE_URL` database additionally requires `npm run db:seed -- --force` |
| `npm test` | vitest — gating rules, soft deadlines, hero tie-break, timezone math, the enrollments backfill migration, DB-backed query + messages-authorization tests (in-memory PGlite), Bunny token math, stamping, auth |
| `npm run typecheck` / `lint` | TypeScript strict / ESLint |

## How it hangs together

- `lib/gating.ts` — Rules 1–3 as pure functions (Rule 1 is enrollment-based
  since Phase 2 — SPEC §15.2 — plus the soft-deadline "overdue" rule);
  **every** access decision (pages *and* the material-bytes API) goes
  through them. `lib/access.ts` loads a student's enrollments per request.
  Unit-tested, plus DB-backed query tests on an in-memory PGlite.
- `db/schema.ts` — the six SPEC §6 tables + `sessions`, plus the Phase 2
  tables (`enrollments`, `messages`, `settings`) and fields (cohort `blurb` /
  `is_listed`, module `due_date`). Migration 0005 backfilled one active
  enrollment per old `users.cohort_id` before dropping that column.
- `lib/auth.ts` — hashed server-side sessions; `lib/password.ts` — scrypt
  password hashing. Sign-in is username + password; the tutor creates
  accounts and resets passwords in `/admin`. No email service anywhere.
- `lib/storage.ts` — one `FileStorage` interface; `./storage` folder in dev,
  Bunny Storage when `BUNNY_STORAGE_*` are set.
- `lib/video.ts` — Bunny Stream signed-embed tokens (tested), video-object
  creation, TUS upload signatures; local `<video>` streaming in dev.
- `lib/stamp.ts` — every student PDF download gets "Prepared for {name} ·
  {email}" stamped on each page (pdf-lib).
- `app/app/*` — student screens (mobile-first, 390px-checked, per DESIGN.md):
  `/app` dashboard (due dates, overdue badges), `/app/courses` (my courses +
  catalog with "Ask to join"), `/app/assignments` (what I owe),
  `/app/messages` (one thread with Dimitra, polling refresh), module pages.
- `lib/messages.ts` — the only reader/writer of `messages`; every function
  takes the acting user and derives the thread from it (a forged student id
  in a POST is ignored — tested), so student A can never read or write B's
  thread. Body rule: trimmed, non-empty, ≤ 4000 characters.
- `app/admin/*` — students (create/pause/reset password, per-course
  enrollments), join-request queue, courses (blurb + catalog listing),
  modules (create/edit/upload/reorder, due dates), progress matrix,
  messages inbox (all threads, unread counts, reply). Function over beauty.
- `events` table is **write-only** in V1 (views, downloads, video progress
  every 30s) — parent digests and clinic briefs build on it later.

## Before a real launch (content, not code)

- Replace the initials avatar on `/` with Dimitra's photo (SPEC §7: "tutor
  bio + photo — she is the brand").
- Set the real contact email on the landing page (currently a placeholder
  `mailto:hello@example.com`).
- Confirm the credential claims on the landing page with Dimitra — they come
  from the approved mockups, but they are factual statements on a public page.
- Confirm the product name (SPEC §14 — "Lumen" is a working title).
- Set `APP_TIMEZONE` if the tutor ever works outside Europe/Athens — all
  release-date inputs and displayed dates use it.

## Production notes (M3/M5 finishing steps — need real accounts)

- **Region:** deploy EU-only (Hetzner VPS, or Vercel + Neon EU). Students
  are mostly minors: the app stores name, email, cohort — nothing else.
- **Env:** see `.env.example`; set `AUTH_SECRET`, `APP_URL`, `DATABASE_URL`,
  and the Bunny keys. Every vendor path is env-switched — no code changes.
- **Bunny Stream:** one library, token authentication ON. Playback URLs are
  signed server-side and expire (`lib/video.ts`); pasting an embed URL into
  a logged-out window fails. Uploads: `createBunnyVideo()` +
  `bunnyUploadSignature()` implement the create + presigned-TUS handshake;
  wire the admin dropzone to TUS as the finishing step. These paths are
  written to Bunny's documented contracts but **unverified until real
  credentials exist** — verify with the M3 checklist in SPEC.md.
- **Backups:** use managed Postgres backups, or nightly
  `pg_dump "$DATABASE_URL" | gzip > lumen-$(date +%F).sql.gz`.
  **Restore:** `gunzip -c lumen-DATE.sql.gz | psql "$DATABASE_URL"` — then
  log in and spot-check a student account. Files under `./storage` (or the
  Bunny zone) back up separately with plain file copies.
- **Account deletion:** delete the user row (cascades to submissions,
  sessions, events) and remove `storage/submissions/{userId}/`.

## Repo map

```
SPEC.md  DESIGN.md  CLAUDE.md      # the three sources of truth
design/                            # approved mockup sources (see design/README.md)
db/                                # schema, migrations, seed
lib/                               # gating, auth, storage, video, stamping
app/                               # routes: / (landing), /login,
                                   #   /app (student), /admin (tutor), /api/*
components/lumen/                  # the design system, from DESIGN.md recipes
components/app/, components/admin/ # feature components
scripts/                           # asset extraction + seed-video generator
storage/                           # dev file storage (gitignored)
```
