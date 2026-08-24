import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Six domain tables per SPEC §6, plus the sessions table auth needs, plus the
// Phase 2 tables from SPEC §15.3 (enrollments, messages, settings).

export const roleEnum = pgEnum("role", ["admin", "student"]);
export const levelEnum = pgEnum("level", ["HL", "SL"]);
export const materialTypeEnum = pgEnum("material_type", [
  "video",
  "slides",
  "exercises",
  "solutions",
]);
export const eventTypeEnum = pgEnum("event_type", [
  "video_progress",
  "download",
  "view",
]);
// requested → (approve) active ⇄ paused → ended. Decline deletes the row.
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "requested",
  "active",
  "paused",
  "ended",
]);
export const messageSenderEnum = pgEnum("message_sender", ["student", "tutor"]);

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  level: levelEnum("level").notNull(),
  examYear: integer("exam_year").notNull(),
  // Catalog fields (SPEC §15.3): listed cohorts appear on /app/courses.
  blurb: text("blurb"),
  isListed: boolean("is_listed").notNull().default(false),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleEnum("role").notNull().default("student"),
  name: text("name").notNull(),
  // Login identity: username + scrypt password hash (lib/password.ts).
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Brute-force lockout (lib/lockout.ts): 10 failures → 15-minute lock.
  // Stored in the DB so it survives restarts and works across processes.
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  // Contact + PDF-stamping field only — plays no role in authentication.
  email: text("email").notNull().unique(),
  // Cohort membership lives in `enrollments` (SPEC §15.3); `active` stays the
  // global master switch — Lever 1, Rule 3.
  active: boolean("active").notNull().default(true),
  // Stamped on sign-in and refreshed on activity (lib/auth) — sessions are
  // deleted on sign-out, so "last seen" cannot live on the sessions table.
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id),
    weekNumber: integer("week_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    releaseDate: timestamp("release_date", { withTimezone: true }).notNull(),
  },
  // One module per week per cohort — duplicate week numbers would make the
  // week ordering (and the tutor's mental model) ambiguous.
  (t) => [uniqueIndex("modules_cohort_week_unique").on(t.cohortId, t.weekNumber)],
);

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  type: materialTypeEnum("type").notNull(),
  title: text("title").notNull(),
  storageKey: text("storage_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    fileKey: text("file_key"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("submissions_student_module_unique").on(t.studentId, t.moduleId)],
);

// Write-only in V1 (SPEC §6): captured from day one, read by nothing.
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  type: eventTypeEnum("type").notNull(),
  value: integer("value"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per student × cohort (SPEC §15.3). Backfilled from users.cohort_id
// by migration 0005; the status drives Rule 1 (lib/gating.ts).
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id),
    status: enrollmentStatusEnum("status").notNull().default("requested"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("enrollments_student_cohort_unique").on(t.studentId, t.cohortId)],
);

// One thread per student — not per course (SPEC §15.3). Used from M7.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sender: messageSenderEnum("sender").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("messages_student_created_idx").on(t.studentId, t.createdAt)],
);

// Key/value admin settings: booking_url, clinic_text (SPEC §15.3). Used from M8.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Cohort = typeof cohorts.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type EnrollmentStatus = Enrollment["status"];
export type Message = typeof messages.$inferSelect;
