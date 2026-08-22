CREATE TYPE "public"."enrollment_status" AS ENUM('requested', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('student', 'tutor');--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"sender" "message_sender" NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_cohort_id_cohorts_id_fk";
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "blurb" text;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "is_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_cohort_unique" ON "enrollments" USING btree ("student_id","cohort_id");--> statement-breakpoint
CREATE INDEX "messages_student_created_idx" ON "messages" USING btree ("student_id","created_at");--> statement-breakpoint
-- Backfill (SPEC §15.3): one ACTIVE enrollment from every existing
-- users.cohort_id, dated to the account's creation, BEFORE the column goes.
INSERT INTO "enrollments" ("student_id", "cohort_id", "status", "requested_at", "decided_at")
SELECT "id", "cohort_id", 'active', "created_at", "created_at" FROM "users" WHERE "cohort_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "cohort_id";