ALTER TABLE "login_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "login_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
UPDATE "users" SET "username" = split_part("email", '@', 1), "password_hash" = 'locked' WHERE "username" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
