CREATE TABLE "trash" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"payload" jsonb NOT NULL,
	"listed" boolean DEFAULT true NOT NULL,
	"by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"restored_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "trash_business_created" ON "trash" ("business_id","created_at");