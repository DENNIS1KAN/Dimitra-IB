# Road to Success: Launch checklist

Formerly the working title Lumen; renamed 2026-08-24 (SPEC §15.7 #20).

What stands between the repository at HEAD and real students. Split by owner; each line is done when the person can tick it without asking the other.

## Developer

**Video and files (SPEC §15.7 #25)**

There is no media vendor. Uploads land on the server's own disk under `storage/` and are served to signed-in students by `/api/materials`, which re-checks the gating rules on every byte and streams range slices from a file offset. Nothing here needs an account or a key.

- [x] Serving is production grade: a seek gets a 206 whose slice matches the stored bytes; a malformed or unsatisfiable Range gets 416 with `Content-Range: bytes */size`; `getRange` never reads more than the slice. Covered by `lib/range.test.ts` and `lib/storage.test.ts`.
- [x] A video the tutor already hosts elsewhere can be pasted as a link per video (Loom, Google Drive, unlisted YouTube), with its limits stated next to the field in the admin.
- [ ] **Size the disk for the whole course.** A 24-week course of short videos is roughly **15 to 30 GB**. Provision with headroom for a second course and for re-recordings, and set an alert before the volume fills: an upload that runs out of disk fails at the worst moment, the Friday before a Monday release.
- [ ] Run the M3 checks on the production box: upload a real MP4 in admin, it plays for a signed-in student; the same `/api/materials/{id}` URL signed out is a **401**, and as another cohort's student a **404**.

**Deploy (EU)**
- [ ] Host in the EU (Hetzner VPS, or Vercel + Neon EU); `DATABASE_URL` to managed Postgres; `AUTH_SECRET` (long random), `APP_URL`, `APP_TIMEZONE=Europe/Athens`. If the host has an ephemeral filesystem, `storage/` needs a real mounted volume, not the container's disk.
- [ ] **Backups cover two things, not one: Postgres AND `storage/`.** The database holds who, when and what was submitted; `storage/` holds every video, PDF and submitted photo. Either one alone restores to a broken platform. Nightly `pg_dump` (README "Production notes") plus a nightly copy of `storage/` off the box.
- [ ] **Restore rehearsal, both halves.** Restore the dump into a scratch database, restore `storage/` beside it, sign in against it, then open a module and actually play a video and download a stamped PDF. A database that restores while the files do not is the failure this rehearsal exists to catch.
- [ ] `npm run db:migrate` against production; create Dimitra's admin account (seed is dev-only, never run `db:seed` in production).
- [ ] Full production smoke, student loop: sign in on a phone, dashboard, watch a video, download stamped slides ("Road to Success · Prepared for {name}"), submit a photo, solutions unlock, message Dimitra, schedule page opens the booking link in a new tab, change own password.
- [ ] Full production smoke, admin loop: create a course, create a student (+ first enrollment), publish a module with videos + PDFs + a dd/mm/yyyy release day (unlocks 09:00 Athens), approve a join request, pause/resume an enrollment, pause/unpause a student (Rule 3), open a submission from the matrix, reply in messages, set settings.
- [x] No third-party requests on any page: Plus Jakarta Sans is vendored under OFL and self-hosted by `next/font/local` (SPEC §15.7 #26), and there is no other external asset. A pasted link video is the one deliberate exception, and only on that video's own page.
- [ ] Confirm in production that `Cache-Control: private, no-store` still holds on the material and submission routes (it does in dev), and that a link video's iframe is the only outbound request a page makes.

**Identity**
- [x] **Name: DONE (2026-08-24):** "Road to Success by Anglou Dimitra" (SPEC §15.7 #20); wordmark, `metadata` titles and README updated.
- [ ] The **domain**, then `APP_URL`. Register it in Dimitra's name, not the developer's.

## Dimitra

**Sessions**
- [ ] Create a Google Calendar **appointment schedule** for 1:1s (Google Meet attached), copy its booking page URL, paste it into **Admin → Settings → booking_url**, and write the first **clinic note** (`clinic_text`).

**Landing page** (`/`)
- [ ] A photo to replace the initials avatar.
- [ ] The real contact email (currently a placeholder `mailto:`).
- [ ] Confirm every credential claim on the page is accurate as written (degree, years, examiner role, results). They are factual statements on a public page.

**Content**
- [ ] Record and upload **weeks 1 to 2** for each course (2 to 4 videos of 10 to 15 minutes each, slides PDF, exercises PDF, solutions PDF), with release days set, so the first two weeks are ready before anyone signs in.
- [ ] **Keep your own copies.** The platform is delivery, not the archive: your original recordings stay on your own drive. If something on the server is ever lost, your drive is what puts it back.
- [ ] Write each cohort's catalog blurb and tick "Listed" only for courses students may ask to join.

**Pilot**
- [ ] Pick **two or three canary students**, create their accounts, hand them their username and password in person, and run a **one-week pilot**: they log in, watch, submit, message; you approve, reply, and check the progress matrix.
- [ ] Only then migrate everyone else (create accounts + enrollments; pause anyone who has not paid).

## Both
- [ ] Agree the support path: students message in-app first; WhatsApp stays the fallback.
- [ ] Agree the weekly rhythm: Dimitra publishes the next module by Friday for its Monday 09:00 release; the developer checks the error log once a week for the first month.
