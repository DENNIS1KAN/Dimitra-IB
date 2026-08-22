# M8 — Sessions, Account Password, Submission Viewer, Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four M8 pieces from SPEC §15: `/app/sessions` (clinic text + Google Meet booking link-out), `/app/account` (change own password), the admin submission viewer reached from the progress matrix, and `/admin/settings` (`booking_url`, `clinic_text`).

**Architecture:** Three small server-only modules own the data paths — `lib/settings.ts` (key/value upsert, admin-only writes), `lib/account.ts` (own-password change on the *acting* user: verify current with the existing scrypt path, hash the new one; the action then revokes the user's other sessions), `lib/submissions.ts` (admin-only read of a submission + its student/module). Submission bytes are served by one admin-only route (`/api/admin/submissions/[id]/file`) that answers 404 to anyone else — students keep no read path. Pages are server components; forms use `useActionState` for inline errors as in M7.

**Tech Stack:** as M6/M7.

**Spec:** `SPEC.md` §15.4 (`/app/sessions`, `/app/account`), §15.5 (submission viewer, settings), §15.6 M8 checklist.

## Global Constraints
- Same as the M6/M7 plans. Student pages never accept a user id from the client; admin routes go through `requireAdmin()`.
- "Same scrypt path": `lib/password.ts` (`verifyPassword`, `hashPassword`, `isAcceptablePassword`) — nothing new for passwords.

---

### Task 0: Migration test timeout
- [ ] `db/migrate.test.ts`: explicit `30_000` ms on the replay test (flaked at ~4.9s vs the 5s default).

### Task 1: Pure rules + data modules (TDD, in-memory PGlite)
**Files:** `lib/settings-rules.ts`(+test), `lib/settings.ts`(+test), `lib/account.ts`(+test), `lib/submissions.ts`(+test), `lib/auth.ts` (`deleteSessionsExcept`, `revokeOtherSessions`), `lib/content-type.ts` (shared ext → MIME map, also used by the materials route).

**Interfaces:**
- `validateBookingUrl(raw: unknown)` → `{ ok: true; url: string }` (empty allowed) | `{ ok: false; reason: "invalid-url" }` — only `http(s)://` absolute URLs.
- `validateClinicText(raw: unknown)` → `{ ok: true; text: string }` | `{ ok: false; reason: "too-long" }` (trim, ≤ 2000).
- `getSettings()` → `{ bookingUrl: string; clinicText: string }` (missing keys = "").
- `updateSettings(actor, formData)` → `{ ok: true } | { ok: false; reason }`; non-admin throws `SettingsAccessError`.
- `changeOwnPassword(actor, formData)` → `{ ok: true } | { ok: false; reason: "too-short" | "wrong-current" }`; reads `current` + `next`; updates only `actor.id`.
- `deleteSessionsExcept(userId, keepTokenHash | null)`; `revokeOtherSessions(userId)` (cookie-aware wrapper).
- `adminSubmission(actor, id)` → `{ submission, student, module, cohort } | null`; non-admin throws `SubmissionAccessError`.
- `contentTypeFor(key)` → MIME by extension (default `application/octet-stream`).

### Task 2: Pages, actions, routes
- `/app/sessions`, `/app/account` (+ `components/app/password-form.tsx`), student nav items; `/admin/settings`, `/admin/submissions/[id]`, `/api/admin/submissions/[id]/file`, progress-matrix cell links, admin nav item; `Button` gains `external` (new tab, `rel="noopener noreferrer"`).

### Task 3: Verify, docs, push
- Chrome walk (390 / 1280): settings saved → `/app/sessions` shows clinic text and the booking button opens the Google URL in a new tab; nikos changes his password → old password fails, new works (then restored); nikos uploads a real PNG → admin opens it from the matrix; a student's GET on the file route → 404; petros → Rule 3 on both new pages.
- `npm test && typecheck && lint && build`; SPEC §15.6 M8 ticked; README / PROJECT_REPORT / DESIGN.md; commit; push.
