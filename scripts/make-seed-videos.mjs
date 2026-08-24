#!/usr/bin/env node
// Generates short real WebM clips for the seeded video materials so the dev
// player demonstrably works with no external accounts (SPEC §9 dev mode).
// Uses Chromium (Playwright) + canvas + MediaRecorder — no ffmpeg needed.
//
// Usage: node scripts/make-seed-videos.mjs [chromiumPath]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright-core"));
} catch {
  ({ chromium } = require("playwright"));
}

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executablePath = process.argv[2] || process.env.CHROMIUM_PATH || undefined;

const targets = [];
for (const week of [5, 6, 7, 8]) {
  for (const k of [1, 2]) targets.push({ key: `seed/w${week}-video-${k}.webm`, label: `Week ${week} · Video ${k}` });
}
targets.push({ key: "seed/sl-w6-video-1.webm", label: "SL cohort · Video 1" });
targets.push({ key: "seed/sl-w6-video-2.webm", label: "SL cohort · Video 2" });

const record = async (page, label) =>
  page.evaluate(
    (text) =>
      new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        const stream = canvas.captureStream(30);
        const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = async () => {
          const buf = await new Blob(chunks).arrayBuffer();
          resolve(Array.from(new Uint8Array(buf)));
        };
        let t = 0;
        const draw = () => {
          ctx.fillStyle = "#f9f4f2";
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = "#ffce00";
          ctx.beginPath();
          ctx.arc(320 + Math.cos(t / 20) * 140, 180 + Math.sin(t / 20) * 80, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#2d2c2b";
          ctx.font = "bold 42px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Road to Success", 320, 100);
          ctx.font = "500 24px sans-serif";
          ctx.fillText(text, 320, 320);
          t++;
        };
        const iv = setInterval(draw, 33);
        rec.start();
        setTimeout(() => {
          clearInterval(iv);
          rec.stop();
        }, 5000);
      }),
    label,
  );

const main = async () => {
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  await page.goto("about:blank");
  for (const t of targets) {
    const bytes = await record(page, t.label);
    const file = path.join(repo, "storage", t.key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(bytes));
    console.log("wrote", t.key, `${(bytes.length / 1024).toFixed(0)}kB`);
  }
  await browser.close();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
