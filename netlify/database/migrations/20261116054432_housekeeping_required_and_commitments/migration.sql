CREATE TABLE "housekeeping_commitments" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"staff_name" text NOT NULL,
	"task_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "housekeeping_commitments_person_task" UNIQUE("business_id","staff_name","task_id")
);
--> statement-breakpoint
ALTER TABLE "housekeeping_tasks" ADD COLUMN "required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "housekeeping_tasks" SET "required" = true WHERE "key" IN ('station-client', 'station-close', 'sweep-floor', 'restock-fridge', 'shampoo-bowls');
