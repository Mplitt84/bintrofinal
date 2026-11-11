CREATE TABLE "client_formulas" (
	"id" serial PRIMARY KEY,
	"kind" text DEFAULT 'hair' NOT NULL,
	"client_name" text NOT NULL,
	"service_date" text NOT NULL,
	"service" text DEFAULT '' NOT NULL,
	"lines" jsonb DEFAULT '[]' NOT NULL,
	"developer" text DEFAULT '' NOT NULL,
	"ratio" text DEFAULT '' NOT NULL,
	"processing_minutes" integer DEFAULT 0 NOT NULL,
	"leftover" text DEFAULT '' NOT NULL,
	"retail" jsonb DEFAULT '[]' NOT NULL,
	"aftercare" text DEFAULT '' NOT NULL,
	"follow_up_on" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formula_photos" (
	"id" serial PRIMARY KEY,
	"formula_id" integer NOT NULL,
	"label" text DEFAULT 'after' NOT NULL,
	"media_type" text DEFAULT 'image/jpeg' NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "aftercare_template" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "formula_photos" ADD CONSTRAINT "formula_photos_formula_id_client_formulas_id_fkey" FOREIGN KEY ("formula_id") REFERENCES "client_formulas"("id") ON DELETE CASCADE;