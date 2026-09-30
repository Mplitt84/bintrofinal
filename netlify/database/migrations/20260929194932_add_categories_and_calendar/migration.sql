CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"kind" text DEFAULT 'task' NOT NULL,
	"date" text NOT NULL,
	"start_time" text DEFAULT '' NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"repeat" text DEFAULT 'none' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"tax_group" text DEFAULT 'service' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "calendar_token" text DEFAULT '' NOT NULL;