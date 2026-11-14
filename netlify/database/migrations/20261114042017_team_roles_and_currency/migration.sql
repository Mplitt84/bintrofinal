ALTER TABLE "business_profile" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "sells_retail" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "manages_inventory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "does_qa" boolean DEFAULT false NOT NULL;