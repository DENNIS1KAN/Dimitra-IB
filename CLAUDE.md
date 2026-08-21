# Lumen (working title) — CLAUDE.md

Lumen is a private learning platform for one IB tutor (Dimitra): her 1:1 students move to weekly pre-recorded modules (videos, slides, exercises) with solutions gated behind a submitted attempt, and access controlled by exactly two admin levers — a per-student active flag mirroring offline PayPal payments, and per-module release dates. Scale is 10–30 students, one admin, one tenant; the stack is a boring Next.js (App Router, TypeScript strict) monolith with Postgres + Drizzle, Tailwind + shadcn/ui, magic-link auth, and Bunny for video/files in production — dev mode needs zero external accounts (magic links print to the console, files use a local `./storage` adapter behind the same interface).

**Standing rule: SPEC.md is authoritative for scope/behavior, DESIGN.md for visuals; conflicts get flagged, not silently resolved.**

Working rules:

- Build milestones strictly per SPEC.md §10, M1 → M5, one at a time; each milestone's verification checklist must pass (and be confirmed) before the next begins.
- The three gating rules in SPEC.md §5 are the entire business logic; they live in one tested module. Resist adding cases.
- All UI comes from DESIGN.md tokens and recipes — never improvised, never re-inferred from `design/`. Out-of-scope mockup screens are listed there as specced-but-deferred; do not build them.
- Mobile-first: build and check every student screen at 390px before desktop. Desktop variants are responsive layouts of the same routes, not separate pages.
- Screens are the real app wired to the database — no static mockups, no placeholder JSON.
- Small commits, one coherent change each. Before declaring a milestone done: typecheck, lint, run tests, then walk the milestone's SPEC.md checklist.
- Ambiguous or tempting to add? Ask, don't assume; state any assumption explicitly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
