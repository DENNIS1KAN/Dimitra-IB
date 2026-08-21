#!/usr/bin/env node
// Regenerates the local-only design assets (licensed fonts + original mockup
// export) from your copy of the Lumen mockup HTML. These are gitignored
// because the repo is public and Apercu Pro is a licensed font — see
// design/README.md.
//
// Usage: node scripts/extract-design-assets.mjs /path/to/Lumen_UI_Mockups_standalone.html
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const src = process.argv[2]
if (!src || !fs.existsSync(src)) {
  console.error('Usage: node scripts/extract-design-assets.mjs /path/to/Lumen_UI_Mockups_standalone.html')
  process.exit(1)
}
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const html = fs.readFileSync(src, 'utf8')
const manifest = JSON.parse(html.match(/<script type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/)[1])

const dec = (entry) => {
  const buf = Buffer.from(entry.data, 'base64')
  if (!entry.compressed) return buf
  for (const fn of ['gunzipSync', 'inflateSync', 'inflateRawSync']) {
    try { return zlib[fn](buf) } catch { /* try next */ }
  }
  throw new Error('could not decompress manifest entry')
}

const fonts = {
  '0c3b52fb-6c5e-4ab8-976d-13ba81904883': 'apercu-pro/apercu-pro-regular.otf',
  'e71b4151-3f15-4d59-ae49-de48b9239993': 'apercu-pro/apercu-pro-regular-italic.otf',
  '36832939-4fa4-47fe-ab5f-0e405575d316': 'apercu-pro/apercu-pro-medium.otf',
  '895fd295-c6e5-4525-acb3-0a98749b0a5a': 'apercu-pro/apercu-pro-medium-italic.otf',
  '4fed8396-ff6b-41f8-881e-3344d37cd991': 'apercu-pro/apercu-pro-bold.otf',
  '0a10f49a-0038-40c1-bc1a-2c1a3e6b87bd': 'apercu-pro/apercu-pro-bold-italic.otf',
  '29242aa0-738f-4bd2-98f6-36267b527ff4': 'material-symbols-rounded.woff2',
}
fs.mkdirSync(path.join(repo, 'design/fonts/apercu-pro'), { recursive: true })
for (const [id, name] of Object.entries(fonts)) {
  const out = path.join(repo, 'design/fonts', name)
  fs.writeFileSync(out, dec(manifest[id]))
  console.log('wrote', path.relative(repo, out))
}

const orig = path.join(repo, 'design/Lumen_UI_Mockups_standalone.html')
fs.copyFileSync(src, orig)
console.log('wrote', path.relative(repo, orig))

// The app serves fonts from public/fonts when present.
const pub = path.join(repo, 'public/fonts/apercu-pro')
if (fs.existsSync(path.join(repo, 'public'))) {
  fs.mkdirSync(pub, { recursive: true })
  for (const name of Object.values(fonts)) {
    const from = path.join(repo, 'design/fonts', name)
    const to = path.join(repo, 'public/fonts', name)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
  console.log('copied fonts into public/fonts/')
}
