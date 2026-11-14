CREATE TABLE "retail_goals" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"period_key" text NOT NULL,
	"target_cents" integer DEFAULT 0 NOT NULL,
	"focus_tips" jsonb DEFAULT '[]' NOT NULL,
	"set_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retail_goals_business_staff_period" UNIQUE("business_id","staff_name","period_key")
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "retail_commission_pct" integer DEFAULT 0 NOT NULL;