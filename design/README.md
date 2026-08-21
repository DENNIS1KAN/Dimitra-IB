# design/ — approved UI sources

The visual source of truth for Lumen. `extracted/` holds the text sources
pulled from the approved mockup export:

- `tokens.css` — the design-token stylesheet, verbatim (colors, type scale,
  spacing, radii, shadows, global element defaults).
- `icons.css` — Material Symbols Rounded setup, verbatim.
- `design-system.js` — the 20-component library exactly as shipped in the
  mockups (component recipes with exact values).
- `screens/*.jsx` — the ten screen compositions as authored.
- `mockup-shell.html` — the frame layout, captions, desktop nav, and mount
  wiring for all eleven mockup frames.

## Local-only assets (gitignored)

Two assets are deliberately **not committed** because this repository is
public and the Apercu Pro font is commercially licensed (files provided by
the owner — publishing them would redistribute a licensed font):

- `design/fonts/` — 6 Apercu Pro faces + Material Symbols Rounded woff2
- `design/Lumen_UI_Mockups_standalone.html` — the original export (embeds
  the same font files)

Regenerate both from your own copy of the mockup export:

```
node scripts/extract-design-assets.mjs /path/to/Lumen_UI_Mockups_standalone.html
```

The app renders with its fallback font stack when the Apercu files are
absent, and uses them automatically (via `public/fonts/`) when present.
If this repo is ever made private, the assets can simply be committed.

DESIGN.md at the repo root is the distilled, authoritative reference —
build UI from DESIGN.md, not by re-inferring from these files.
