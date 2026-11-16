CREATE TABLE "housekeeping_checks" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"task_id" integer NOT NULL,
	"staff_name" text NOT NULL,
	"day_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housekeeping_reminders" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text DEFAULT '' NOT NULL,
	"ref" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"done_at" timestamp,
	"done_by" text DEFAULT '' NOT NULL,
	CONSTRAINT "housekeeping_reminders_business_ref" UNIQUE("business_id","ref")
);
--> statement-breakpoint
CREATE TABLE "housekeeping_tasks" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"key" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'sparkles' NOT NULL,
	"tone" text DEFAULT 'garnet' NOT NULL,
	"cadence" text DEFAULT 'daily' NOT NULL,
	"scope" text DEFAULT 'each' NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "housekeeping_tasks_business_name" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE INDEX "housekeeping_checks_day" ON "housekeeping_checks" ("business_id","day_key");