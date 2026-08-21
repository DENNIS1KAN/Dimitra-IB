// Demo data per SPEC §10 M1: 1 admin, 1 cohort, 3 students (one paused),
// 4 modules (2 released / 2 future), placeholder materials, 1 pre-seeded
// submission. Plus one extra cohort with a released module and no members,
// so the "other cohort's modules invisible even by direct URL" checklist
// item can actually be walked. Callable from the CLI seed and from the
// dev-db bootstrap.
import { parseLocalInTz } from "../lib/tz";
import type { Db } from "./index";
import {
  cohorts,
  events,
  loginTokens,
  materials,
  modules,
  sessions,
  submissions,
  users,
} from "./schema";

const DAY = 24 * 60 * 60 * 1000;

export async function runSeed(db: Db, log: (msg: string) => void = console.log) {
  const now = Date.now();
  // Most recent Monday 09:00 in the tutor's timezone that is already past.
  const monday = (() => {
    const d = new Date(now);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    const mondayDate = new Date(d.getTime() - dow * DAY);
    const iso = mondayDate.toISOString().slice(0, 10);
    let t = parseLocalInTz(`${iso}T09:00`).getTime();
    if (t > now) t -= 7 * DAY;
    return t;
  })();

  log("[seed] wiping…");
  await db.delete(events);
  await db.delete(submissions);
  await db.delete(materials);
  await db.delete(loginTokens);
  await db.delete(sessions);
  await db.delete(modules);
  await db.delete(users);
  await db.delete(cohorts);

  log("[seed] cohorts…");
  const [chem] = await db
    .insert(cohorts)
    .values({ name: "Chemistry HL 2027", subject: "Chemistry", level: "HL", examYear: 2027 })
    .returning();
  const [other] = await db
    .insert(cohorts)
    .values({ name: "Chemistry SL 2027", subject: "Chemistry", level: "SL", examYear: 2027 })
    .returning();

  log("[seed] users…");
  await db.insert(users).values({
    role: "admin",
    name: "Dimitra Anglou",
    email: "dimitra@example.com",
    cohortId: null,
  });
  const [nikos] = await db
    .insert(users)
    .values({ role: "student", name: "Nikos Karras", email: "nikos@example.com", cohortId: chem.id })
    .returning();
  await db.insert(users).values([
    { role: "student", name: "Eleni Vasil", email: "eleni@example.com", cohortId: chem.id },
    {
      role: "student",
      name: "Petros Adamou",
      email: "petros@example.com",
      cohortId: chem.id,
      active: false, // the paused student (Rule 3)
    },
  ]);

  log("[seed] modules…");
  const weeks = [
    {
      weekNumber: 5,
      title: "Energetics: Born–Haber cycles",
      description:
        "Born–Haber diagrams reward slow, labelled drawing — sketch the full cycle before any numbers. Bring your enthalpy sign errors on Thursday and we'll fix them together.",
      releaseDate: new Date(monday - 7 * DAY),
    },
    {
      weekNumber: 6,
      title: "Buffers & titration curves",
      description:
        "Buffers trip everyone up the first week — watch video 2 twice before you try the exercises. Bring your titration curves on Thursday and we'll fix them together.",
      releaseDate: new Date(monday),
    },
    {
      weekNumber: 7,
      title: "Redox: half-equations & cells",
      description: "Half-equations first, potentials second.",
      releaseDate: new Date(monday + 7 * DAY),
    },
    {
      weekNumber: 8,
      title: "Organic: mechanisms I",
      description: "Curly arrows done properly.",
      releaseDate: new Date(monday + 14 * DAY),
    },
  ];
  const chemModules = await db
    .insert(modules)
    .values(weeks.map((w) => ({ ...w, cohortId: chem.id })))
    .returning();
  const [otherModule] = await db
    .insert(modules)
    .values({
      cohortId: other.id,
      weekNumber: 6,
      title: "Acids & bases essentials",
      description: "SL cohort module — must never render for HL students.",
      releaseDate: new Date(monday),
    })
    .returning();

  log("[seed] materials…");
  const byWeek = Object.fromEntries(chemModules.map((m) => [m.weekNumber, m]));
  // Keys are per-cohort (prefix) so deleting a material in one cohort can
  // never break another cohort's copy.
  const placeholder = (moduleId: string, week: number, prefix = "w") => [
    { moduleId, type: "video" as const, title: `1 · Core ideas`, storageKey: `seed/${prefix}${week}-video-1.webm`, sortOrder: 0 },
    { moduleId, type: "video" as const, title: `2 · Worked examples`, storageKey: `seed/${prefix}${week}-video-2.webm`, sortOrder: 1 },
    { moduleId, type: "slides" as const, title: "Slides — annotated", storageKey: `seed/${prefix}${week}-slides.pdf`, sortOrder: 2 },
    { moduleId, type: "exercises" as const, title: "Exercises — set A", storageKey: `seed/${prefix}${week}-exercises.pdf`, sortOrder: 3 },
    { moduleId, type: "solutions" as const, title: "Worked solutions", storageKey: `seed/${prefix}${week}-solutions.pdf`, sortOrder: 4 },
  ];
  for (const m of chemModules) await db.insert(materials).values(placeholder(m.id, m.weekNumber));
  await db.insert(materials).values(placeholder(otherModule.id, 6, "sl-w"));

  log("[seed] placeholder files…");
  // Real bytes for the placeholder PDF materials so the whole student loop
  // works in dev (inline view, stamped download). Videos come from
  // scripts/make-seed-videos.mjs — the player copes when they're absent.
  const { storage } = await import("../lib/storage");
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const allMaterials = [
    ...chemModules.flatMap((m) => placeholder(m.id, m.weekNumber)),
    ...placeholder(otherModule.id, 6, "sl-w"),
  ];
  for (const mat of allMaterials) {
    if (!mat.storageKey.endsWith(".pdf")) continue;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([595, 842]); // A4
    page.drawText("lumen.", { x: 48, y: 780, size: 28, font: bold });
    page.drawText(mat.title, { x: 48, y: 740, size: 16, font: bold });
    page.drawText(`Placeholder ${mat.type} PDF for dev seeding.`, {
      x: 48,
      y: 716,
      size: 11,
      font,
    });
    await storage.put(mat.storageKey, Buffer.from(await doc.save()), "application/pdf");
  }

  log("[seed] submission…");
  // Nikos already attempted week 5 → solutions visible there, hidden on week 6.
  await db.insert(submissions).values({
    studentId: nikos.id,
    moduleId: byWeek[5].id,
    note: "Attempted on paper — struggled with lattice enthalpy signs.",
    createdAt: new Date(monday - 5 * DAY),
  });

  log("[seed] done.");
  log("  admin:   dimitra@example.com");
  log("  student: nikos@example.com  (active, 1 submission on week 5)");
  log("  student: eleni@example.com  (active, no submissions)");
  log("  student: petros@example.com (PAUSED — Rule 3 screen)");
}
