// Demo data per SPEC §10 M1 + §15.6 M6: 1 admin, 3 cohorts, 3 students (one
// paused), 4 HL modules (2 released / 2 future) + 1 SL module, placeholder
// materials, 1 pre-seeded submission, and enrollments that let every M6
// checklist item be walked: nikos = HL active + SL *requested* (a requested
// course shows no modules); eleni = HL + SL active (a two-course student,
// overdue on week 5); petros = HL active but globally paused (Rule 3). The
// Maths cohort is listed with no modules — something to "Ask to join".
// Callable from the CLI seed and from the dev-db bootstrap.
import { hashPassword } from "../lib/password";
import { defaultDueDate, mostRecentMondayAt } from "../lib/tz";
import type { Db } from "./index";
import {
  cohorts,
  enrollments,
  events,
  materials,
  modules,
  sessions,
  submissions,
  users,
} from "./schema";

const DAY = 24 * 60 * 60 * 1000;

export async function runSeed(db: Db) {
  // Most recent Monday 09:00 in the tutor's timezone that is already past.
  const monday = mostRecentMondayAt("09:00").getTime();

  console.log("[seed] wiping…");
  await db.delete(events);
  await db.delete(submissions);
  await db.delete(materials);
  await db.delete(sessions);
  await db.delete(enrollments);
  await db.delete(modules);
  await db.delete(users);
  await db.delete(cohorts);

  console.log("[seed] cohorts…");
  const [chem] = await db
    .insert(cohorts)
    .values({
      name: "Chemistry HL 2027",
      subject: "Chemistry",
      level: "HL",
      examYear: 2027,
      blurb:
        "The full HL syllabus in weekly modules — videos, annotated slides, exercise sets, and worked solutions once you've had a go. Thursday clinics for the sticky bits.",
      isListed: true,
    })
    .returning();
  const [other] = await db
    .insert(cohorts)
    .values({
      name: "Chemistry SL 2027",
      subject: "Chemistry",
      level: "SL",
      examYear: 2027,
      blurb: "SL core topics, one module a week, paced for the May 2027 exams.",
      isListed: true,
    })
    .returning();
  const [maths] = await db
    .insert(cohorts)
    .values({
      name: "Mathematics AA SL 2027",
      subject: "Mathematics",
      level: "SL",
      examYear: 2027,
      blurb:
        "Analysis & Approaches SL — weekly problem sets with full worked solutions. Starting September.",
      isListed: true,
    })
    .returning();

  console.log("[seed] users…");
  // Shared dev password for every seeded account: "lumen123".
  const devPassword = () => hashPassword("lumen123");
  await db.insert(users).values({
    role: "admin",
    name: "Dimitra Anglou",
    username: "dimitra",
    passwordHash: devPassword(),
    email: "dimitra@example.com",
  });
  const [nikos] = await db
    .insert(users)
    .values({
      role: "student",
      name: "Nikos Karras",
      username: "nikos",
      passwordHash: devPassword(),
      email: "nikos@example.com",
      lastSeenAt: new Date(monday - 5 * DAY), // matches his week-5 submission
    })
    .returning();
  const [eleni, petros] = await db
    .insert(users)
    .values([
      {
        role: "student",
        name: "Eleni Vasil",
        username: "eleni",
        passwordHash: devPassword(),
        email: "eleni@example.com",
      },
      {
        role: "student",
        name: "Petros Adamou",
        username: "petros",
        passwordHash: devPassword(),
        email: "petros@example.com",
        active: false, // the paused student (Rule 3)
      },
    ])
    .returning();

  console.log("[seed] enrollments…");
  const joined = new Date(monday - 60 * DAY);
  await db.insert(enrollments).values([
    { studentId: nikos.id, cohortId: chem.id, status: "active", requestedAt: joined, decidedAt: joined },
    { studentId: nikos.id, cohortId: other.id, status: "requested" }, // pending → no modules
    { studentId: eleni.id, cohortId: chem.id, status: "active", requestedAt: joined, decidedAt: joined },
    { studentId: eleni.id, cohortId: other.id, status: "active", requestedAt: joined, decidedAt: joined }, // two courses
    { studentId: petros.id, cohortId: chem.id, status: "active", requestedAt: joined, decidedAt: joined },
  ]);
  void maths; // listed, no modules, nobody enrolled — the catalog's "Ask to join" card

  console.log("[seed] modules…");
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
  // Soft due dates: the Sunday 23:59 after each release (SPEC §15.3) — so
  // week 5 is already overdue for anyone who hasn't submitted it.
  const chemModules = await db
    .insert(modules)
    .values(
      weeks.map((w) => ({ ...w, cohortId: chem.id, dueDate: defaultDueDate(w.releaseDate) })),
    )
    .returning();
  const [otherModule] = await db
    .insert(modules)
    .values({
      cohortId: other.id,
      weekNumber: 6,
      title: "Acids & bases essentials",
      description: "SL cohort module — only students enrolled in the SL course see it.",
      releaseDate: new Date(monday),
      dueDate: defaultDueDate(new Date(monday)),
    })
    .returning();

  console.log("[seed] materials…");
  // Keys are per-cohort (prefix) so deleting a material in one cohort can
  // never break another cohort's copy.
  const placeholder = (moduleId: string, week: number, prefix = "w") => [
    { moduleId, type: "video" as const, title: `1 · Core ideas`, storageKey: `seed/${prefix}${week}-video-1.webm`, sortOrder: 0 },
    { moduleId, type: "video" as const, title: `2 · Worked examples`, storageKey: `seed/${prefix}${week}-video-2.webm`, sortOrder: 1 },
    { moduleId, type: "slides" as const, title: "Slides — annotated", storageKey: `seed/${prefix}${week}-slides.pdf`, sortOrder: 2 },
    { moduleId, type: "exercises" as const, title: "Exercises — set A", storageKey: `seed/${prefix}${week}-exercises.pdf`, sortOrder: 3 },
    { moduleId, type: "solutions" as const, title: "Worked solutions", storageKey: `seed/${prefix}${week}-solutions.pdf`, sortOrder: 4 },
  ];
  // One list feeds both the insert and the PDF writing below, so the rows in
  // the database and the files in storage can never drift apart.
  const allMaterials = [
    ...chemModules.flatMap((m) => placeholder(m.id, m.weekNumber)),
    ...placeholder(otherModule.id, otherModule.weekNumber, "sl-w"),
  ];
  await db.insert(materials).values(allMaterials);

  console.log("[seed] placeholder files…");
  // Real bytes for the placeholder PDF materials so the whole student loop
  // works in dev (inline view, stamped download). Videos come from
  // scripts/make-seed-videos.mjs — the player copes when they're absent.
  const { storage } = await import("../lib/storage");
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
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

  console.log("[seed] submission…");
  // Nikos already attempted week 5 → solutions visible there, hidden on week 6.
  const week5 = chemModules.find((m) => m.weekNumber === 5);
  if (!week5) throw new Error("seed: week 5 module missing");
  await db.insert(submissions).values({
    studentId: nikos.id,
    moduleId: week5.id,
    note: "Attempted on paper — struggled with lattice enthalpy signs.",
    createdAt: new Date(monday - 5 * DAY),
  });

  console.log("[seed] done. Password for every account: lumen123");
  console.log("  admin:   dimitra  (full admin panel; 1 pending join request)");
  console.log("  student: nikos    (Chemistry HL active, week 5 submitted; asked to join SL)");
  console.log("  student: eleni    (Chemistry HL + SL active — two courses; week 5 overdue)");
  console.log("  student: petros   (PAUSED globally — Rule 3 screen)");
}
