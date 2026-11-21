ALTER TABLE "app_users" ADD COLUMN "team_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "reminders_on" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "hours" jsonb DEFAULT '{}' NOT NULL;