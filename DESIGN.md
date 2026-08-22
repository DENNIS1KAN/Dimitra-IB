# Lumen — Design System

**Phase 2 (M9, 2026-08-22): this file now describes Dimitra's palette.** Source of truth is `design/lumen-dashboard-mockup.html` (authoritative); `design/extracted/tokens.css` is the secondary reference (radii, input/divider greys, subject colours). The original direction — Apercu Pro, Material Symbols, sunbeam-yellow accents, the cream/linen mockup skin in `design/extracted/` — is **superseded**; §10 maps the old tokens to the new ones so older notes still read. **All UI is built from the tokens and recipes in this file — never improvised, never re-inferred from the raw HTML.** Where this file and SPEC.md disagree, SPEC.md wins on scope/behavior, this file wins on skin; every known disagreement is listed in §9.

---

## 1. Color tokens

### Palette — Dimitra's brand decisions (`app/globals.css`)

| Token | Hex | Role |
|---|---|---|
| `--color-blue` | `#0061ef` | navigation bar, links, selected states, standard primary buttons |
| `--color-blue-tint` | `#e8f0fe` | blue tint chips, `::selection` |
| `--color-indigo` | `#3b197f` | headings, the hero band, serious/academic surfaces |
| `--color-indigo-soft` | `#4b2a96` | hero gradient companion |
| `--color-orange` | `#f47d31` | **the one motivational CTA per view** (ink text on it, never white); also the brand dot and the clinic-strip accent |
| `--color-jade` | `#00a86b` | correct / completed / progress — **fills only** |
| `--color-forest` | `#1e7a4a` | green **as text** (contrast-safe) |
| `--color-mint` | `#e7f5ee` | jade tint fills (done badges, note mark) |
| `--color-cream` | `#f9f4f2` | page background |
| `--color-white` | `#ffffff` | cards, interactive panels |
| `--color-ink` | `#131211` | display text, row titles, text on orange |
| `--color-graphite` | `#2d2c2b` | body text |
| `--color-stone` | `#63605d` | muted text, locked state |
| `--color-linen` | `#e2ded9` | borders |
| `--color-ash` / `--color-driftwood` | `#d0d0d0` / `#c6c1b9` | input borders / dividers (tokens.css) |
| `--color-plum` / `--color-celeste` | `#5f2b89` / `#00a4ff` | subject colours (tokens.css) |

**No yellow anywhere.** `#ffce00` is gone from every token, class and component.

### Semantic tokens

- **Surfaces:** `--surface-page` = cream · `--surface-card` = white · `--surface-nav` = blue · `--surface-hero` = `linear-gradient(135deg, indigo, indigo-soft)` · `--surface-contemplative` = indigo · `--surface-tint-blue` = blue-tint · `--surface-tint-green` = mint · `--surface-ink` = ink
- **Text:** `--text-primary` = graphite · `--text-display` = ink · `--text-heading` = indigo (every `h1–h4` by default) · `--text-secondary` = graphite · `--text-tertiary` / `--text-disabled` = stone · `--text-inverse` = white · `--text-on-cta` = ink · `--text-success` = forest
- **Borders:** `--border-card` = linen · `--border-input` = ash · `--border-divider` = driftwood
- **Actions:** `--action-primary` = blue · `--action-cta` = orange · `--action-dark` = ink · `--accent-brand` = orange (wordmark dot) · `--accent-dimitra` = indigo (her avatar)
- **States:** `--state-done` = jade · `--state-now` = blue · `--state-locked` = stone · `--state-alert` = `#c4320a`
- **Subject colours:** `--subject-chemistry` = blue · `--subject-orange` · `--subject-plum` · `--subject-celeste` · `--subject-indigo`

### Recurring literals

| Value | Use |
|---|---|
| `rgba(255,255,255,.78)` / `.16` / `.10` | nav link text / active pill / hover pill on the blue bar |
| `rgba(255,255,255,.55)` | hero eyebrow, admin "ADMIN" label |
| `rgba(255,255,255,.18)` / `.75` | hero progress track / hero secondary text |
| `rgba(255,255,255,.2)` | avatar disc on the nav |
| `rgba(0,97,239,.12)` | input focus ring (3px) |
| `rgba(196,50,10,.08)` + `#c4320a` | alert badge tint / error text — the only non-palette colour, kept for errors |
| `rgba(19,18,17,.06)` | ghost IconButton hover |

### Global element defaults

- `body`: cream background, graphite text, body scale; `h1–h4`: indigo
- Links: blue, underline on hover
- `::selection`: blue-tint background, ink text
- `:focus-visible`: 3px blue outline (white inside `.lmn-nav` / `.lmn-hero`)

---

## 2. Typography

**Family:** `--font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`. Loaded as the mockup does — a Google Fonts stylesheet link (`display=swap`) in `app/layout.tsx` — so the build never depends on a network fetch; offline or blocked, the system stack renders. Weights 400 / 500 / 700 / 800.

**Icons:** inline SVG only (`components/lumen/icon.tsx`): 24×24 stroke glyphs in `currentColor`, keyed by the names the code always used (`check_circle`, `lock`, `play_circle`, `chevron_right`, …). No icon font — nothing can ever render as a literal word again.

**Scale** (px / line-height / tracking):

| Token | Size | Leading | Tracking | Weight convention |
|---|---|---|---|---|
| caption | 13 | 1.5 | −0.1px | 500–700 |
| body-sm | 14 | 1.5 | −0.15px | 500 |
| body | 16 | 1.55 | −0.16px | 400 |
| subheading | 20 | 1.3 | −0.4px | 800 |
| heading-sm | 24 | 1.25 | −0.5px | 800 |
| heading | 32 | 1.15 | −0.03em | 800 |
| heading-lg | 40 | 1.12 | −0.03em | 800 |
| display | 52 | 1.1 | −0.03em | 800 |
| display-lg | 72 | 1.05 | −0.03em | 800 |

Conventions: headings are indigo 800 with tight negative tracking; the hero h1 is `clamp(28px, 4.4vw, 40px)`; row titles are ink 15.5px 700 −0.2px; section labels are 13px 700 uppercase `.05–.06em`; meta lines 13.5–14.5px stone.

---

## 3. Spacing & layout

- Unit **4px**; steps 4 … 96. `--page-max-width: 1040px` — the `.lmn-wrap` shell (16px gutters ≤ 640px, 24px above).
- Phone design width **390px** (SPEC's test width). Every student route and the admin must report `scrollWidth ≤ viewport` at 390 and 1280 (checked in the M9 walk).
- The dashboard is **one responsive column** (mockup): hero band full-width, then the 1040px wrap. The other student pages keep a 720px reading column; admin tables scroll inside their card.

---

## 4. Radii & shadows

| Token | Value | Used for |
|---|---|---|
| `--radius-small` / `--radius-inputs` | 8px | inputs |
| `--radius-xl` | 12px | textareas, note mark |
| `--radius-row` | 16px | list rows, rail rows, lesson rows |
| `--radius-cards` | 20px | cards, note card |
| `--radius-featured` | 24px | feature card, lock panels, bottom sheet |
| `--radius-pills` / `--radius-buttons` | 999px | pills, buttons, chips, badges, progress bars |

| Token | Value | Used for |
|---|---|---|
| `--shadow-card` | `0 1px 2px rgba(19,18,17,.05), 0 8px 24px rgba(59,25,127,.07)` | white cards, note, feature |
| `--shadow-float` | `0 8px 24px rgba(19,18,17,.12)` | toasts |
| `--shadow-subtle` | `0 2px 0 0 rgba(19,18,17,.15)` | dark buttons |
| `--shadow-cta` | `0 8px 20px rgba(244,125,49,.35)` | orange CTA on hover |

---

## 5. Component recipes

Interaction defaults: filled buttons hover `brightness(.96)`; the CTA lifts 2px with `--shadow-cta`; rows hover → blue border + `translateX(2px)`; transitions `.15s ease`; `.lmn-rise` entrance (`.55s`, respects `prefers-reduced-motion`).

**Wordmark** — "lumen" 800 (ink, or white with `inverse`) + an orange disc (`--accent-brand`) as the full stop. Sizes sm 22 / md 28 / lg 44 / xl 88; optional byline "by Dimitra Anglou" 500 stone (inverse: white 75%).

**Button** — inline-flex, gap 8, 700, radius pills. Sizes sm 14px/8×16 · md 16px/12×24 · lg 16.5px/15×30. Variants: **primary** (blue, white text — the standard button) · **cta** (orange, **ink** text, 800, hover lift — exactly one per view: "Start module" / "Continue module" on the dashboard, "Submit my attempt" on the module page) · **dark** (ink, white text, `--shadow-subtle`) · **secondary** (white, linen border, ink text; hover cream) · **ghost** (transparent, blue 700 text). `external` renders `<a target="_blank" rel="noopener noreferrer">`. Disabled: linen + stone.

**IconButton** — square, radius pills; sm 32 / md 40 / lg 48, SVG ≈ 55% of size. Variants ghost · outline · dark · **inverse** (white on the blue bar). Always `aria-label`.

**Avatar** — circle, 700 initials ≈ 38%; sm 28 / md 36 / lg 48 / xl 72. Tones: **indigo** (Dimitra) · **neutral** (linen, graphite — students on light surfaces) · **inverse** (white 20% disc, white text — on the nav).

**Badge** — pill, 4×10, caption 700, optional 13px SVG. Tones: neutral (cream + linen border, stone) · **new** (blue-tint + blue — the mockup "chip") · **done** (mint + **forest**) · locked (linen + stone) · live (indigo + white) · alert (red tint + `#c4320a`).

**Chip** (`.lmn-chip`) — the feature card's "This week": blue-tint bg, blue 13px 700, 5×12, pill.

**Card** — radius cards, 20px pad (featured: radius 24, 28px). Surfaces: white (linen border + `--shadow-card`) · cream · tint (blue-tint) · indigo (hero gradient, white text).

**Icon** — `<Icon name size color strokeWidth />` → inline SVG, `aria-hidden`. Names: check, check_circle, circle, lock, lock_open, play_circle, description, edit_note, photo_camera, chevron_right, arrow_back, arrow_right, logout, download, upload, hourglass, schedule, pause, flag, chat, calendar, menu, school, history_edu, fact_check, trending_up.

**Nav** (`.lmn-nav`) — blue bar, 1040px wrap, min-height 64; brand = inverse sm Wordmark; links 14.5px 500 white-78% 8×14 pill (hover white on 10% white; `aria-current` white on 16% white); "who" = first name (hidden < 1024) + inverse sm Avatar; inverse IconButton sign-out. Under 1024px the link row wraps beneath the brand and scrolls sideways (`min-width: 0`). Admin: same bar with an "ADMIN" label (white 55%, 13px uppercase). Unread dot on Messages: 8px jade disc + sr-only text.

**Hero** (`.lmn-hero`) — indigo gradient band, white text, 40/84 (52/92 ≥ 641px): eyebrow 13px 700 uppercase `.06em` white-55% → h1 clamp(28, 4.4vw, 40) 800 −0.03em → progress line: 8px track white-18% with jade fill + 14px white-75% caption.

**NoteCard** (`.lmn-note`) — white, radius cards, `--shadow-card`, 22×26 pad (18×20 ≤ 640), flex gap 16: 38px mint square (radius 12) with a forest `chat` icon · h2 13px 700 uppercase `.05em` indigo "Note from Dimitra · {day}" · body 15.5px graphite, max 62ch. Overlaps the hero seam by −52px.

**ModuleCard** (`.lmn-feature`) — white, radius 24, `--shadow-card`, 30px pad (24 ≤ 640), flex wrap gap 28: chip + optional New / Overdue badges → h2 indigo 24 800 "Week N · title" → meta 14.5px stone → optional due caption 13px 600 → the **cta** Button with a trailing `arrow_right`.

**Clinic strip** (`.lmn-clinic`) — white, 3px orange left border, radius 0 12 12 0, 14×18, orange `calendar` icon, 14.5px "**Next clinic** — {clinic_text}"; links to `/app/sessions`.

**Rail** (`.lmn-rail` / `.lmn-rail-row`) — the term, week by week: 2px line on the left (jade for done rows, blue for the current, linen for locked — one segment per row), rows white + linen border + radius row + 16×20 + 12px gap; node 24px cream disc holding a 22px disc: **done** jade + white check · **now** white with a 3px blue ring · **locked** linen + stone lock. Title ink 15.5 700; sub 13.5 stone with `.ok` forest 600 ("Solutions unlocked"); right side: blue 700 "Continue" / "Review" (hidden ≤ 640) or stone "Unlocks …" for locked rows; Overdue = alert Badge.

**ListRow / LessonRow** — white, linen border, radius row, 16×20 / 14×16, gap 12; leading 22px SVG in the subject / kind colour (video blue · slides plum · exercise graphite · solutions indigo); title ink 15.5 700; meta 13.5 stone; trailing node; chevron stone; hover → blue border + 2px shift. Locked lesson: stone title + locked Badge.

**LockPanel** — locked: white, dashed driftwood border, radius 24, stone `lock`, indigo subheading 800, body-sm, dark CTA. Unlocked: hero gradient, **jade** `lock_open`, white text, secondary (white) CTA.

**ProgressBar** — 6px linen track (8px white-18% `onDark`), **jade** fill, caption label stone (white-75% on dark), `role=progressbar`.

**Input / TextArea** — unchanged recipe; labels ink 500; focus blue border + ring. **Composer / password / settings forms** — `useActionState` with inline `role=alert` / `role=status` copy (DESIGN.md §6 M7/M8 entries).

**Toast** — white, radius cards, `--shadow-float`; 32px **jade** disc with a white check; message ink 700; detail stone.

**Footer** (`.lmn-footer`) — linen top border, 26/40 pad, 13.5px stone, two spans space-between ("Lumen · IB Chemistry with Dimitra Anglou" / "Access by invitation").

**BackLink** — blue 700 body-sm with a leading `arrow_back`; replaces the old TopBar so every page has exactly one header (the nav bar).

**FilterPill, SessionCard, TabBar** — *specced-but-deferred*, recipes only in `design/extracted/design-system.js`.

---

## 6. Screen recipes (V1 + Phase 2 routes)

Mobile-first; every student screen is built and checked at 390px before desktop. Desktop variants are responsive layouts of the same routes, not separate pages.

### `/` — public landing
Indigo hero band (inverse xl Wordmark + byline, white-85% tagline, white-16% pills "Access by invitation" / "IB Chemistry HL · SL", secondary Button "Student sign in" + white "For parents" link) → "How a week works": four white Cards with blue / graphite / plum / indigo SVG icons → About: xl indigo Avatar, indigo 800 name, cream credentials Card (indigo icons), indigo quote Card → Contact: indigo 800 heading + primary Button → footer with the sm Wordmark. Copy stays truthful: students sign in with a username and password from Dimitra.

### `/login` — Welcome
24px side padding; centered xl Wordmark (ink + orange dot) + stone tagline; bottom-anchored form (username, password Inputs; lg primary Button "Sign in"; caption "Accounts are created by Dimitra").

### `/app` — dashboard (mockup, one responsive layout)
Hero (eyebrow = course name(s); h1 "Good morning/afternoon/evening, {first name}" by the tutor's clock; jade progress "{c} of {r} modules complete · {pct}%") → NoteCard (−52px seam overlap; hidden when the week has no note) → ModuleCard for the current week (chip "This week" — prefixed by the course when the student has several; Overdue badge; meta counts; due; **orange CTA** "Start module" / "Review module") — or a featured Card with the paused / requested / not-enrolled / nothing-yet copy → clinic strip when `settings.clinic_text` is set → "Your term, week by week" (indigo 19px 800) + "All assignments" link → Rail (current · older released · locked teasers, course name in the sub when multi) → footer.

### `/app/modules/[id]` — module detail
BackLink "Home" → eyebrow "Week N" → h1 indigo 800 → badge row (New this week · course · Attempt sent · Overdue) + soft-deadline caption → LessonRows → solutions block: unlocked LockPanel (+ solutions LessonRow) or the locked LockPanel whose action is the **orange CTA** "Submit my attempt" (bottom sheet unchanged).

### `/app/courses`, `/app/assignments`, `/app/messages`, `/app/sessions`, `/app/account`
As specified in their M6–M8 entries (below in §8/§9 history and PROJECT_REPORT), with indigo headings, white cards, mint/forest done badges, blue-tint "new" chips, jade progress fills, and primary (blue) buttons — "Ask to join" stays dark (ink), "Book a 1:1 on Google Meet" is primary.

### Paused state (Rule 3)
Cream screen, centered column: md Wordmark → locked LockPanel "Your access is paused". No nav, no content.

### `/admin/*`
Same blue nav bar with the ADMIN label and the page links; content inherits the tokens (indigo headings, white cards, blue primary buttons, forest/mint done badges). Function over beauty (SPEC §12).

---

## 7. Implementation notes

- Tokens and every `.lmn-*` class live in `app/globals.css`; components use the vars, never raw hex (the error red is the documented exception).
- No font files and no icon files ship or are gitignored any more: the type comes from the stylesheet link in `app/layout.tsx`, the icons from `components/lumen/icon.tsx`. `scripts/extract-design-assets.mjs` and `public/fonts/` belong to the superseded direction and are no longer used.
- `--radius-pills: 999px` ≈ `rounded-full`.
- Mockup animation (`.lmn-rise`) is opt-in per element and disabled under `prefers-reduced-motion`.

## 8. Specced-but-deferred (do not build; recipes preserved in `design/extracted/`)

- **Clinics** screen (+ SessionCard, clinic ListRows on Home/DesktopHome) — booking is a non-goal (SPEC §3).
- **Standalone Progress** screen (term stats card, "clinics attended", "Paper 1 mock", topic checklist) — no student progress screen in SPEC §7.
- **In-app About Dimitra** (phone + desktop) — content reused on `/` landing instead.
- **TabBar** 4-tab bottom nav (home/library_books/event/monitoring) — single student destination in V1.
- **Multi-class switcher** + Math AA SL content — one cohort per student (SPEC §6).
- **Per-lesson done tracking** (LessonRow done state, ModuleCard "x of y done" bar) — V1 completion is submission-per-module.
- **"Message Dimitra"** buttons — the mocked buttons; messaging itself exists since Phase 2 M7 (`/app/messages`, §6).
- **DeskNav page links** as mocked (Home/Modules/Clinics/Progress/About) — Phase 2 builds its own set (Home/Courses/Assignments/…, see §5 DeskNav); the mocked Clinics/About links stay parked.
- Design-only content strings (Nikos, Week 6 buffers copy, clinic dates) — placeholder narrative, not product copy.

## 9. Conflicts (design vs SPEC) — SPEC wins on scope/behavior, design wins on skin

| # | Design shows | SPEC says | Resolution |
|---|---|---|---|
| 1 | Clinics tab/screen, SessionCards, clinic rows | Booking = Calendly; non-goal §3 | Parked |
| 2 | Progress tab/screen + term stats + topic checklist | No student progress screen; bar on /app + admin matrix §7 | Parked |
| 3 | In-app About Dimitra (phone+desktop) + nav link | Tutor bio lives on public landing `/` §7 | Parked; content → landing |
| 4 | Separate Home + Modules screens, 4-tab TabBar | One list route `/app` §7 | Merged /app, no tab bar (user-confirmed) |
| 5 | "This week from Dimitra" note card | No note feature/field §6 | Skin `modules.description` (user-confirmed) |
| 6 | Class switcher; student in Chemistry HL + Math AA SL | `users.cohort_id` — exactly one cohort §6 | Single cohort; subject color from cohort. **Phase 2 (SPEC §15):** enrollments allow several cohorts — `/app` aggregates them (rows name their course), `/app/courses` lists them; still no class switcher |
| 7 | Welcome = email + invite-code + "Sign in" | `/login` email→magic-link; `/invite/[token]` §7 | SPEC mechanics, Welcome skin; no code field |
| 8 | Per-lesson done states, "2 of 5 done" progress | Completion = submission exists; events write-only §6 | Parked; binary module completion |
| 9 | Submit sheet lacks "mark attempted" | Submission = file OR note OR "attempted" §6 | Add ghost "Just mark as attempted" |
| 10 | "Message Dimitra" buttons | In-app messaging non-goal §3 | Parked in V1. **Phase 2 (SPEC §15):** a single thread per student ships as `/app/messages` (recipe in §6); the mocked buttons themselves stay unbuilt |
| 11 | No landing, no paused, no admin mockups | Landing + admin required §7; paused state required §5 Rule 3 | Composed from tokens (§6 above); admin = shadcn |
| 12 | Wordmark "lumen." + "by Dimitra Anglou" | Name is an open question §14, non-blocking until M5 | Keep working title |
| 13 | Locked teaser labeled "Week 7" only | Rule 1 §5: teasers show **title** + "Unlocks {date}" | SPEC wins: label "Week N — {title}" |
| 14 | Topic badge "Topic 8 · Acids & bases" on module page | No topic/syllabus field in §6 | Parked (no schema backing) |
| 15 | Per-material meta: video durations, "18 pages", "8 questions" | §6 materials: only type/title/storage_key/sort_order | Parked; derived counts fine; revisit at M3 (Bunny exposes duration) |
| 16 | Locked-solutions copy "Solutions unlock after your attempt" / CTA "Submit my attempt" | §5 Rule 2 prescribes hint "Submit your attempt to unlock solutions" | SPEC copy in the mockup's panel skin |
| 17 | DesktopHome "All modules →" link | Mooted by the /app merge (#4) | Dropped |
| 18 | Badge copy "New this Monday" | Releases aren't necessarily Mondays (release_date is free §6) | Built copy: "New this week" (released < 7 days) |
| 19 | Welcome CTA "Sign in"; invite-only helper on the combined screen | §7 splits the screen: /login (email → link) + /invite/[token] | /login CTA reads "Email me a sign-in link" (honest about the magic link); the invite-only caption appears on both screens |
| 20 | — (no landing mockup; SPEC §7 wants tutor bio + **photo**) | Photo required | Initials Avatar stands in until a real photo is provided (see README pre-launch); contact email is a placeholder |
| 21 | No overdue / deadline state anywhere | SPEC §15.1 soft deadlines need an "Overdue" badge | `alert` Badge tone on the documented `#c4320a` error literal (§5) — kept through M9 as the one non-palette colour |
| 22 | Mockup hides the nav links behind a hamburger ≤ 640px | A menu needs client state; the link row must work without JS | Links wrap to a scrollable second row under the brand (no hamburger) |
| 23 | Mockup feature card shows video "pips" and "2 of 3 videos watched" | Per-lesson progress is parked (#8) | Pips omitted; meta shows material counts + the soft due date |
| 24 | Mockup uses orange for the clinic strip accent and the brand dot as well as the CTA | Owner: "orange — exactly one motivational CTA per view" | Read as a rule about CTAs: one orange *button* per view; the dot and the 3px clinic accent follow the mockup |
| 25 | Mockup loads Plus Jakarta Sans from Google Fonts at runtime | `next/font` would self-host but needs the network at build time | Runtime stylesheet link (mockup's approach); swap to vendored files if the team wants zero third-party requests |


---

## 10. Superseded direction (Phase 1 → Phase 2 token map)

The first design system (extracted from `design/Lumen_UI_Mockups_standalone.html`) used Apercu Pro, Material Symbols Rounded and sunbeam-yellow accents. It was replaced wholesale in M9 by the palette above; `design/extracted/` stays in the repo as the source of the deferred recipes (§8) and of the secondary tokens. Old → new:

| Phase 1 token | Phase 2 |
|---|---|
| `--color-sunbeam-yellow`, `--surface-accent`, `--accent-punctuation`, `--text-on-yellow`, `--subject-yellow` | removed — no yellow; brand dot is `--accent-brand` (orange); note card is white + mint |
| `--color-charcoal-ink` (text) | `--color-graphite` for body, `--color-ink` for display |
| `--color-mindful-blue` / `--action-primary` | `--color-blue` / `--action-primary` |
| `--color-deep-indigo` / `--accent-dimitra` | `--color-indigo` / `--accent-dimitra`; headings now indigo by default |
| `--state-done` = blue | `--state-done` = jade (fills) + `--text-success` = forest (text) |
| `--radius-cards` 16 / `--radius-featured` 24 | `--radius-row` 16 / `--radius-cards` 20 / `--radius-featured` 24 |
| `--shadow-card` `0 1px 2px rgba(0,0,0,.04)` | the mockup's two-layer shadow |
| Material Symbols `<span class="material-symbols-rounded">` | `<Icon name=…>` inline SVG |
| Apercu Pro `@font-face` from `public/fonts/` | Plus Jakarta Sans stylesheet link |
| TopBar (page-level header) | BackLink inside the page; the nav bar is the only header |
| Badge `new` = yellow | Badge `new` = blue-tint chip |
