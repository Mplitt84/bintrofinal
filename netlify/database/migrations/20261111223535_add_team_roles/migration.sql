ALTER TABLE "team_members" ADD COLUMN "is_provider" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;