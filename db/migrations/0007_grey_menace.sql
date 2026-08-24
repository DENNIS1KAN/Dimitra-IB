ALTER TABLE "materials" ALTER COLUMN "storage_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_file_or_link" CHECK (("materials"."storage_key" is not null) <> ("materials"."external_url" is not null));