CREATE TABLE "push_keys" (
	"id" integer PRIMARY KEY,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"endpoint" text NOT NULL UNIQUE,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_log" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"kind" text NOT NULL,
	"ref" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_log_once" UNIQUE("business_id","staff_name","kind","ref")
);
--> statement-breakpoint
CREATE TABLE "staff_reminder_prefs" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"on_arrive" boolean DEFAULT true NOT NULL,
	"on_client" boolean DEFAULT true NOT NULL,
	"on_close" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'schedule' NOT NULL,
	"time_zone" text DEFAULT 'America/Chicago' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_reminder_prefs_person" UNIQUE("business_id","staff_name")
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"weekday" integer NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	CONSTRAINT "staff_schedules_person_day" UNIQUE("business_id","staff_name","weekday")
);
--> statement-breakpoint
CREATE TABLE "staff_shifts" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"day_key" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"source" text DEFAULT 'square' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_shifts_person_day" UNIQUE("business_id","staff_name","day_key","source")
);
--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD COLUMN "assign" text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
UPDATE "housekeeping_tasks" SET "assign" = CASE WHEN "required" THEN 'everyone' WHEN "scope" = 'shop' THEN 'rotate' ELSE 'everyone' END;--> statement-breakpoint
UPDATE "housekeeping_tasks" SET "cadence" = 'client', "scope" = 'each', "assign" = 'everyone', "required" = true WHERE "key" IN ('shampoo-bowls', 'sweep-floor');
