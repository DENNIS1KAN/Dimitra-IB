# Lumen — Launch checklist

What stands between the repository at HEAD and real students. Split by owner; each line is done when the person can tick it without asking the other.

## Developer

**Video (SPEC §10 M3)**
- [ ] Bunny account created **under Dimitra's ownership** (she owns the billing and the library; the developer has access) — one Stream library with **token authentication ON**, one Storage zone (EU region).
- [ ] Wire the admin dropzone to Bunny Stream: `createBunnyVideo()` → TUS upload with `bunnyUploadSignature()` (`lib/video.ts`) → store the video GUID as the material's `storage_key`. Until then video files land in `FileStorage` and play through the local player.
- [ ] Run the SPEC M3 checks on the production library: upload a real MP4 in admin → it transcodes and plays for a signed-in student; paste the embed URL into an incognito window → playback **fails** (token expired/invalid).
- [ ] Keys in the production environment: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_REGION` (see `.env.example`).

**Deploy (EU)**
- [ ] Host in the EU (Hetzner VPS, or Vercel + Neon EU); `DATABASE_URL` to managed Postgres; `AUTH_SECRET` (long random), `APP_URL`, `APP_TIMEZONE=Europe/Athens`.
- [ ] Backups on: managed Postgres backups, or nightly `pg_dump` (README "Production notes"); the storage zone backed up separately. Do one **restore rehearsal** into a scratch database and sign in against it.
- [ ] `npm run db:migrate` against production; create Dimitra's admin account (seed is dev-only — never run `db:seed` in production).
- [ ] Full production smoke, student loop: sign in on a phone → dashboard → watch a video → download stamped slides ("Prepared for {name}") → submit a photo → solutions unlock → message Dimitra → sessions page opens the booking link in a new tab → change own password.
- [ ] Full production smoke, admin loop: create a course → create a student (+ first enrollment) → publish a module with videos + PDFs + a dd/mm/yyyy release day (unlocks 09:00 Athens) → approve a join request → pause/resume an enrollment → pause/unpause a student (Rule 3) → open a submission from the matrix → reply in messages → set settings.
- [ ] Confirm no third-party request leaks beyond Google Fonts (or vendor the font files and switch to `next/font/local`), and that `Cache-Control: private, no-store` holds on material and submission routes.

**Identity**
- [ ] Final product name (SPEC §14 — "Lumen" is a working title) and domain; update the wordmark copy, `metadata` titles, `APP_URL`, README.

## Dimitra

**Sessions**
- [ ] Create a Google Calendar **appointment schedule** for 1:1s (Google Meet attached), copy its booking page URL, paste it into **Admin → Settings → booking_url**, and write the first **clinic note** (`clinic_text`).

**Landing page** (`/`)
- [ ] A photo to replace the initials avatar.
- [ ] The real contact email (currently a placeholder `mailto:`).
- [ ] Confirm every credential claim on the page is accurate as written (degree, years, examiner role, results) — they are factual statements on a public page.

**Content**
- [ ] Record and upload **weeks 1–2** for each course (2–4 videos of 10–15 minutes each, slides PDF, exercises PDF, solutions PDF), with release days set — so the first two weeks are ready before anyone signs in.
- [ ] Write each cohort's catalog blurb and tick "Listed" only for courses students may ask to join.

**Pilot**
- [ ] Pick **two or three canary students**, create their accounts, hand them their username/password in person, and run a **one-week pilot**: they log in, watch, submit, message; you approve, reply, and check the progress matrix.
- [ ] Only then migrate everyone else (create accounts + enrollments; pause anyone who hasn't paid).

## Both
- [ ] Agree the support path: students message in-app first; WhatsApp stays the fallback.
- [ ] Agree the weekly rhythm: Dimitra publishes the next module by Friday for its Monday 09:00 release; the developer checks the error log once a week for the first month.
