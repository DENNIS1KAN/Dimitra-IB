import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Six domain tables per SPEC §6, plus what magic-link auth needs.

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

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  level: levelEnum("level").notNull(),
  examYear: integer("exam_year").notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleEnum("role").notNull().default("student"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  cohortId: uuid("cohort_id").references(() => cohorts.id),
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

// Auth: single-use magic-link tokens + server-side sessions.
export const loginTokens = pgTable("login_tokens", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // 'login' opens a session; 'invite' also lets the student set their name first.
  purpose: text("purpose").notNull().default("login"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
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
