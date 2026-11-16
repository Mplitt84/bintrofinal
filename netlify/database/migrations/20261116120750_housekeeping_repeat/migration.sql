ALTER TABLE "housekeeping_tasks" ADD COLUMN "repeat" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE "housekeeping_tasks" SET "cadence" = 'daily', "repeat" = '{"kind":"weeks","days":[],"every":1,"anchor":"","monthDay":1,"flex":true}'::jsonb WHERE "cadence" = 'weekly';
