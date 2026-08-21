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

## Quick start (dev — zero external accounts)

> `package.json` pins exact versions (no lockfile in the repo — it couldn't
> travel this workspace's API-based push path); `npm install` regenerates a
> local `package-lock.json` on first run.

```bash
npm install

# Postgres 16 — either Docker:
docker compose up -d
# …or point DATABASE_URL at any Postgres 16 (see .env.example)

cp .env.example .env          # defaults work with the docker-compose db
npm run db:migrate            # create tables
npm run db:seed               # demo cohort, students, modules, PDFs

npm run dev                   # http://localhost:3000
```

**Sign in:** enter a seeded email on `/login` — the magic link **prints to
the server console** (no email service in dev).

| Account | Email | State |
|---|---|---|
| Admin (tutor) | `dimitra@example.com` | full admin panel |
| Student | `nikos@example.com` | active, week 5 already submitted |
| Student | `eleni@example.com` | active, nothing submitted |
| Student | `petros@example.com` | **paused** → sees the Rule 3 screen |

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
| `npm run db:seed` | reset + seed demo data (writes placeholder PDFs to `./storage`) |
| `npm test` | vitest — the §5 gating rules + Bunny token math |
| `npm run typecheck` / `lint` | TypeScript strict / ESLint |

## How it hangs together

- `lib/gating.ts` — Rules 1–3 as pure functions; **every** access decision
  (pages *and* the material-bytes API) goes through them. Unit-tested.
- `db/schema.ts` — the six SPEC §6 tables + `login_tokens`/`sessions`.
- `lib/auth.ts` — hand-rolled magic links (single-use, 30 min) + hashed
  server-side sessions. Dev: links print to the console. Prod: Resend,
  switched purely on `RESEND_API_KEY`.
- `lib/storage.ts` — one `FileStorage` interface; `./storage` folder in dev,
  Bunny Storage when `BUNNY_STORAGE_*` are set.
- `lib/video.ts` — Bunny Stream signed-embed tokens (tested), video-object
  creation, TUS upload signatures; local `<video>` streaming in dev.
- `lib/stamp.ts` — every student PDF download gets "Prepared for {name} ·
  {email}" stamped on each page (pdf-lib).
- `app/app/*` — student screens (mobile-first, 390px-checked, per DESIGN.md).
- `app/admin/*` — students (invite/pause), modules (create/edit/upload/
  reorder), progress matrix. Function over beauty.
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
  Resend + Bunny keys. Every vendor path is env-switched — no code changes.
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
app/                               # routes: / (landing), /login, /invite/[token],
                                   #   /app (student), /admin (tutor), /api/*
components/lumen/                  # the design system, from DESIGN.md recipes
components/app/, components/admin/ # feature components
scripts/                           # asset extraction + seed-video generator
storage/                           # dev file storage (gitignored)
```
