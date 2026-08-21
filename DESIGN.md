# Lumen — Design System

Extracted from the approved UI mockups (`design/Lumen_UI_Mockups_standalone.html`; sources in `design/extracted/`). **All future UI is built from the tokens and recipes in this file — never improvised, never re-inferred from the raw HTML.** Where this file and SPEC.md disagree, SPEC.md wins on scope/behavior, this file wins on skin; every known disagreement is listed in §9 Conflicts.

Sources of every value: `design/extracted/tokens.css` (tokens, verbatim), `design/extracted/design-system.js` (components), `design/extracted/screens/*.jsx` (compositions), `design/extracted/mockup-shell.html` (frames, nav, mount wiring).

---

## 1. Color tokens

### Base palette (verbatim)

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| `--color-page-cream` | `#f9f4f2` | | `--color-mindful-blue` | `#0061ef` |
| `--color-pure-white` | `#ffffff` | | `--color-sunbeam-yellow` | `#ffce00` |
| `--color-charcoal-ink` | `#2d2c2b` | | `--color-deep-indigo` | `#3b197f` |
| `--color-graphite` | `#44423f` | | `--color-twilight-violet` | `#281466` |
| `--color-slate` | `#4b4c4d` | | `--color-plum` | `#5f2b89` |
| `--color-stone` | `#63605d` | | `--color-mauve` | `#8144a8` |
| `--color-driftwood` | `#c6c1b9` | | `--color-celeste` | `#00a4ff` |
| `--color-linen` | `#e2ded9` | | `--color-blush` | `#ffa1cc` |
| `--color-ash` | `#d0d0d0` | | `--color-brand-orange` | `#f47d31` |
| `--color-soft-black` | `#000000` | | | |

### Semantic tokens

- **Surfaces:** `--surface-page` = page-cream · `--surface-card` = pure-white · `--surface-accent` = sunbeam-yellow · `--surface-contemplative` = deep-indigo · `--surface-ink` = charcoal-ink
- **Text:** `--text-primary` = charcoal-ink · `--text-secondary` = graphite · `--text-tertiary` = slate · `--text-disabled` = stone · `--text-inverse` = pure-white · `--text-display` = soft-black · `--text-on-yellow` = charcoal-ink
- **Borders:** `--border-card` = linen · `--border-input` = ash · `--border-divider` = driftwood
- **Actions:** `--action-primary` = mindful-blue · `--action-dark` = charcoal-ink · `--accent-punctuation` = sunbeam-yellow · `--accent-dimitra` = deep-indigo
- **States:** `--state-done` = mindful-blue · `--state-locked` = stone
- **Subject colors** (one per class; assignment lives in product data): `--subject-chemistry` = mindful-blue · `--subject-orange` = brand-orange · `--subject-plum` = plum · `--subject-celeste` = celeste · `--subject-indigo` = deep-indigo · `--subject-yellow` = sunbeam-yellow

### Recurring literals (used by components, not tokenized in the mockups)

| Value | Use |
|---|---|
| `rgba(0,97,239,.08)` | done-badge tint, clinic icon disc |
| `rgba(0,97,239,.12)` | input focus ring (3px) |
| `#c4320a` | input error border + helper text |
| `#fdfbfa` | ListRow/LessonRow hover background |
| `rgba(45,44,43,.4)` | bottom-sheet scrim |
| `rgba(45,44,43,.06)` | IconButton ghost hover |
| `rgba(255,255,255,.75)` | inverse Wordmark byline |
| `rgba(65,61,69,.2)` | subtle shadow color |

### Global element defaults

- `body`: background `--surface-page`, color `--text-primary`, font `--font-sans`, size/leading/tracking = body, `-webkit-font-smoothing: antialiased`
- Links: `--action-primary`, hover `--color-deep-indigo`, no underline
- `::selection`: background sunbeam-yellow, color charcoal-ink

---

## 2. Typography

**Family:** `--font-sans: 'Apercu Pro', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Weights 400 / 500 / 700 (+ italics). The Apercu Pro files are licensed and **local-only** (this repo is public — see `design/README.md`); regenerate them with `scripts/extract-design-assets.mjs`. The app declares `@font-face` against `public/fonts/` and renders on the fallback stack when they're absent.

**Icons:** Material Symbols Rounded (local-only woff2 via the same script, or the Apache-licensed `material-symbols` npm package), default rendering `font-variation-settings: 'FILL' 1, 'wght' 500`, size 20–24px inline.

**Scale** (px size / line-height / letter-spacing — tracking ≈ −1% body, −2.5% headings, −3% display):

| Token | Size | Leading | Tracking |
|---|---|---|---|
| caption | 12 | 1.5 | −0.12px |
| body-sm | 14 | 1.5 | −0.14px |
| body | 16 | 1.5 | −0.16px |
| subheading | 20 | 1.33 | −0.5px |
| heading-sm | 24 | 1.33 | −0.6px |
| heading | 32 | 1.3 | −0.8px |
| heading-lg | 40 | 1.29 | −1px |
| display | 52 | 1.13 | −1.56px |
| display-lg | 72 | 1.1 | −2.16px |

Conventions from the screens: page titles = heading (mobile) / heading-lg (desktop) at weight 700; card titles = heading-sm 700; section labels = body-sm 700 (sometimes uppercase caption 700 with `.02–.03em` positive tracking); meta lines = caption or body-sm at `--text-tertiary`.

---

## 3. Spacing & layout

- Unit **4px**; steps: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96. `--section-gap: 64px`.
- `--page-max-width: 1200px`; desktop content shells: **1040px** (app screens), **860px** (about-style pages); desktop padding `40–48px top / 32px sides / 64px bottom`.
- Phone design width **390px** (SPEC's test width). Screen padding `20px` horizontal (**exception: Welcome/auth screens use `24px`**, bottom `32px`); content column gaps 10–16px; content top offset under TopBar 4–8px.
- Desktop grid on app screens: `1.6fr 1fr`, gap 24, `align-items: start`.

---

## 4. Radii & shadows

| Token | Value | Used for |
|---|---|---|
| `--radius-small` / `--radius-inputs` | 8px | inputs |
| `--radius-xl` | 12px | textareas, icon discs |
| `--radius-cards` | 16px | list rows, standard cards, toasts |
| `--radius-featured` | 24px | hero/featured cards, lock panels, note cards, bottom-sheet top |
| `--radius-featured-lg` | 32px | largest featured surfaces |
| `--radius-pills` / `--radius-buttons` | 800px | pills, buttons, avatars, badges, progress bars |

| Token | Value | Used for |
|---|---|---|
| `--shadow-subtle` | `rgba(65,61,69,0.2) 0px 2px 0px 0px` | dark buttons (hard offset; removed on :active) |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,0.04)` | white cards |
| `--shadow-float` | `0 8px 24px rgba(45,44,43,0.10)` | toasts, floating elements |
| phone/desk frame | `0 20px 50px rgba(45,44,43,.12)` | mockup frames only, not product UI |

---

## 5. Component recipes

Interaction defaults: hover = `filter: brightness(.96)` (filled buttons) or background shift (rows/pills); active = `translateY(1px)`; transitions `.15s ease` (background/border/filter), `.4s ease` (progress width).

**Wordmark** — 700 "lumen" + sunbeam-yellow "." (`--accent-punctuation`). Sizes: sm 22 / md 28 / lg 44 / xl 88px, tracking −3% of size (−0.66/−0.84/−1.32/−2.64). Optional byline "by Dimitra Anglou": 500, sizes 11/13/16/20, margin-top ≈ 55% of byline size, color `--text-secondary` (inverse: `rgba(255,255,255,.75)`).

**Button** — inline-flex, gap 8, weight 700, radius pills, letter-spacing −0.16px, line-height 1.2. Sizes: sm 14px/8×16 · md 16px/12×24 · lg 16px/14×28. Variants: **primary** (blue bg, white text) · **dark** (charcoal bg, white text, `--shadow-subtle`, shadow drops on :active) · **secondary** (white bg, `--border-card` border, text-primary; hover → cream bg) · **ghost** (transparent, weight 500; hover → opacity .7). Disabled: linen bg + `--text-disabled`, no shadow/cursor.

**IconButton** — square, radius pills. Sizes sm 32 / md 40 / lg 48; icon ≈ 55% of size. Variants: ghost (transparent, `--text-secondary`, hover `rgba(45,44,43,.06)`) · outline (white bg + card border) · dark (charcoal, hover soft-black). Always `aria-label`.

**FilterPill** — 12×20 pad, radius pills, body-sm 500, white bg + card border; hover cream. Active: `--action-dark` bg + white text + leading 6px dot (currentColor). Desktop variant carries an 8px subject-color dot.

**Avatar** — circle, 700 initials at ≈ 38% of size; sizes sm 28 / md 36 / lg 48 / xl 72. Tones: indigo (default; `--accent-dimitra` bg, white text — Dimitra) · yellow (sunbeam bg, on-yellow text) · neutral (linen bg, `--text-secondary` — students).

**Badge** — inline pill, 4×10 pad, caption 500, gap 4, optional 13px icon. Tones: neutral (cream bg + card border, text-secondary) · new (sunbeam bg, on-yellow) · done (`rgba(0,97,239,.08)` bg, action-primary) · locked (linen bg, text-tertiary) · live (deep-indigo bg, white).

**Card** — radius cards + 20px pad; featured → radius featured + 32px pad. Surfaces: white (card bg + card border + `--shadow-card`) · cream · yellow (on-yellow text) · indigo (`--surface-contemplative`, white text).

**Icon** — Material Symbols Rounded span, default 20px, `'FILL' 1,'wght' 500`, `aria-hidden`.

**ListRow** — white card row: 16×20 pad, radius cards, card border, gap 12, hover `#fdfbfa`. Leading 22px icon (color per use), label body 500, optional meta caption at text-tertiary (2px gap), optional trailing node, chevron_right 20px text-secondary (suppressible).

**Toast** — white, radius cards, 14×18 pad, `--shadow-float`, max-width 360. 32px blue disc + 18px white icon; message body-sm 700; optional detail caption text-tertiary.

**Input** — stacked label (body-sm 500) + field: body text, white bg, `--border-input`, radius inputs, 12×16 pad; placeholder `--text-disabled`; focus → `--action-primary` border + 3px `rgba(0,97,239,.12)` ring; helper caption text-tertiary; error → `#c4320a` border + helper.

**TextArea** — as Input but radius xl, 14×16 pad, min-height 96, vertical resize.

**LessonRow** — like ListRow but 14×16 pad. Kind icon (22px): video `play_circle`/action-primary · slides `description`/plum · exercise `edit_note`/graphite · solutions `lock_open`/deep-indigo. Title body 500; meta caption. Done: row opacity .72 + line-through (1px) + Done badge *(deferred in V1 — see §9 #8)*. Locked: `lock` icon + text-tertiary title + Locked badge. Default trailing: chevron.

**LockPanel** — radius featured, 24px pad, centered text. **Locked:** cream bg, `1px dashed --border-divider`, 28px `lock` at `--state-locked`, title subheading 700 text-primary, body body-sm (max-width 400 centered), dark Button CTA. **Unlocked:** `--surface-contemplative` bg, no border, 28px `lock_open` at sunbeam-yellow, white title/body (body .85 opacity), primary Button CTA.

**ModuleCard** (current-week hero) — white, card border, radius featured, 24px pad, `--shadow-card`. Header row: uppercase caption 700 `+.02em` week label at text-tertiary + optional New badge. Title heading-sm 700 (1.25). Meta body-sm text-tertiary (0 0 16px). Optional per-lesson ProgressBar *(deferred — §9 #8)*. Full-width primary Button CTA.

**NoteCard** (tutor note strip) — sunbeam-yellow bg, radius featured, 24px pad (compact 20px), on-yellow text. Header: sm Avatar (indigo) + "This week from Dimitra" body-sm 700 + right-aligned date caption 500 at .7 opacity (12px below). Note body (compact: body-sm), 1.5. Signature "— Dimitra" body-sm 500 italic .85 opacity, 12px above.

**ProgressBar** — optional caption 500 label at text-tertiary (6px below); 6px track, radius pills, linen bg; fill `--action-primary`, width transition .4s.

**TopBar** — 14×20 pad, `--surface-page` bg, gap 12. Either back IconButton (`arrow_back`, −8px left margin) + subheading 700 title (ellipsized), or sm Wordmark; optional trailing node (avatar).

**DeskNav** (desktop top bar) — white bg + bottom card border; inner 1040px, 14×32 pad; sm Wordmark, nav links body 500 8×12 (active text-primary, rest text-tertiary), trailing Avatar. V1: wordmark + avatar only (links belong to deferred screens).

**SessionCard, TabBar** — *specced-but-deferred*, recipes live in `design/extracted/design-system.js` (`SessionCard.jsx`, `TabBar.jsx`).

---

## 6. Screen recipes (V1 routes)

Mobile-first; every student screen is built and checked at 390px before desktop. Desktop variants are responsive layouts of the same routes, not separate pages.

### `/` — public landing (built M5)
No mockup exists; compose from tokens + the About-Dimitra content (see §9 #3): hero with lg/xl Wordmark + byline, tagline subheading ("Private IB Chemistry HL with Dimitra Anglou" pattern), xl indigo Avatar + name heading + "IB Chemistry HL · Athens" subline, credentials Card (20–28px pad, rows of 20px deep-indigo icons + body-sm text: MSc, 12 years, IB examiner, results), indigo featured quote Card ("Chemistry isn't hard — it's cumulative…" + italic signature), how-a-week-works section, "access by invitation" + contact. Desktop 860px shell, two-column credentials/quote grid.

### `/login` — Welcome skin
24px side padding. Centered upper block: xl Wordmark, subheading 500 tagline at text-secondary (max-width 280). Bottom-anchored form (gap 14): email Input + lg primary full-width Button "Sign in". No invite-code field (§9 #7); after submit → same layout, confirmation copy ("Check your email…"; dev: link prints to server console).

### `/invite/[token]` — Welcome skin
Same shell as /login; name Input (+ email display), lg primary Button; helper caption "Lumen is invite-only — ask Dimitra if you need one". Lands in `/app`.

### `/app` — module list (merged Home; user-confirmed)
TopBar(sm Wordmark, trailing neutral Avatar with student initials) → h1 "Hi {first name}." heading 700 (8px top) → NoteCard(current week's `modules.description`; hidden when empty — §9 #5) → hero ModuleCard(current released week: "WEEK N · THIS WEEK", New badge if just released, title, meta = counts derived from material rows e.g. "3 videos · slides · exercises", primary CTA "Start module"/"Continue module") → ProgressBar(completed ÷ released, label "{c} of {r} modules") → older released weeks as ListRows: completed → `check_circle` at subject color + Done badge, no chevron; open-not-completed → subject-colored `play_circle`, chevron (composed — design shows no such row) → future weeks: `lock` at `--state-locked`, label "Week N — {title}" (§9 #13), meta "Unlocks {date}", no chevron, non-interactive.
Desktop ≥1024: DeskNav shell (wordmark + avatar), 1040px, grid 1.6fr/1fr — left: hero + week rows; right: NoteCard + "This term" Card(body-sm 700 label + ProgressBar).

### `/app/modules/[id]` — module detail
TopBar("Week {N}", back → /app) → h1 title heading-sm 700 (4px top) → badge row (gap 8): New badge "New this Monday" when just released; topic badge parked (§9 #14) → LessonRows: videos (`play_circle`, title, meta = material title context only; durations parked §9 #15), slides (`description`), exercises (`edit_note`) → solutions block (8px top): when unlocked, solutions LessonRow (`lock_open`) + unlocked LockPanel("Solutions unlocked", "Nice work…" body, primary "Open solutions"); when locked, LockPanel(title per SPEC copy **"Submit your attempt to unlock solutions"** — §9 #16, body "Upload a photo of your working — marks don't matter here, honest attempts do.", dark CTA "Submit my attempt").
**Submit bottom sheet (M4):** scrim `rgba(45,44,43,.4)`, sheet white radius `24px 24px 0 0`, pad 24/20/28, gap 14: subheading 700 "Submit your attempt" → dashed upload button (cream bg, dashed divider border, radius cards, 22px pad, camera icon + body-sm 500 "Photo of your working") → optional TextArea("Anything you got stuck on? (optional)") → primary full-width "Send to Dimitra" → ghost full-width "Just mark as attempted" (SPEC's third mode; absent from mockup — §9 #9). Success: Toast("Attempt sent to Dimitra", "Solutions are unlocked below") top-centered, ~2.6s.

### Paused state (Rule 3) — full-screen, replaces everything under `/app`
No mockup; compose: page-cream screen, centered column (24px pad): md Wordmark → locked-style LockPanel (cream, dashed border, `lock`) with title "Your access is paused", body "Message Dimitra to continue — your account and progress are safe." No nav, no content. Copy stays friendly per SPEC §5.

### `/admin/*` — plain shadcn defaults
Wordmark sm + "Admin" label; zero custom design effort (SPEC §12). Tables, forms, dialogs straight from shadcn/ui.

---

## 7. Implementation notes

- Tokens ship as CSS custom properties in `globals.css` (copied from `design/extracted/tokens.css`) and are mapped into Tailwind theme keys; components use the vars, never raw hex.
- Apercu Pro + Material Symbols via `@font-face` against `public/fonts/` (populated locally by `scripts/extract-design-assets.mjs`; graceful fallback when absent).
- `--radius-pills: 800px` ≈ `rounded-full`.
- Mockup phone/desk frame chrome (40px/20px rounded frames, frame shadow) is presentation-only — not product UI.

## 8. Specced-but-deferred (do not build; recipes preserved in `design/extracted/`)

- **Clinics** screen (+ SessionCard, clinic ListRows on Home/DesktopHome) — booking is a non-goal (SPEC §3).
- **Standalone Progress** screen (term stats card, "clinics attended", "Paper 1 mock", topic checklist) — no student progress screen in SPEC §7.
- **In-app About Dimitra** (phone + desktop) — content reused on `/` landing instead.
- **TabBar** 4-tab bottom nav (home/library_books/event/monitoring) — single student destination in V1.
- **Multi-class switcher** + Math AA SL content — one cohort per student (SPEC §6).
- **Per-lesson done tracking** (LessonRow done state, ModuleCard "x of y done" bar) — V1 completion is submission-per-module.
- **"Message Dimitra"** buttons — messaging is a non-goal (SPEC §3).
- **DeskNav page links** (Home/Modules/Clinics/Progress/About) — V1 keeps wordmark + avatar.
- Design-only content strings (Nikos, Week 6 buffers copy, clinic dates) — placeholder narrative, not product copy.

## 9. Conflicts (design vs SPEC) — SPEC wins on scope/behavior, design wins on skin

| # | Design shows | SPEC says | Resolution |
|---|---|---|---|
| 1 | Clinics tab/screen, SessionCards, clinic rows | Booking = Calendly; non-goal §3 | Parked |
| 2 | Progress tab/screen + term stats + topic checklist | No student progress screen; bar on /app + admin matrix §7 | Parked |
| 3 | In-app About Dimitra (phone+desktop) + nav link | Tutor bio lives on public landing `/` §7 | Parked; content → landing |
| 4 | Separate Home + Modules screens, 4-tab TabBar | One list route `/app` §7 | Merged /app, no tab bar (user-confirmed) |
| 5 | "This week from Dimitra" note card | No note feature/field §6 | Skin `modules.description` (user-confirmed) |
| 6 | Class switcher; student in Chemistry HL + Math AA SL | `users.cohort_id` — exactly one cohort §6 | Single cohort; subject color from cohort |
| 7 | Welcome = email + invite-code + "Sign in" | `/login` email→magic-link; `/invite/[token]` §7 | SPEC mechanics, Welcome skin; no code field |
| 8 | Per-lesson done states, "2 of 5 done" progress | Completion = submission exists; events write-only §6 | Parked; binary module completion |
| 9 | Submit sheet lacks "mark attempted" | Submission = file OR note OR "attempted" §6 | Add ghost "Just mark as attempted" |
| 10 | "Message Dimitra" buttons | In-app messaging non-goal §3 | Parked |
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
