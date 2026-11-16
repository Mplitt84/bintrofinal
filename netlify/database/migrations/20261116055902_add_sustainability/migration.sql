CREATE TABLE "color_waste_logs" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"month" text NOT NULL,
	"grams" integer NOT NULL,
	"cost_cents_per_oz" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"logged_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "color_waste_logs_business_month" UNIQUE("business_id","month")
);
--> statement-breakpoint
CREATE TABLE "sustainability_partners" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"kind" text DEFAULT 'recycling' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"since" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"added_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sustainability_partners_business_name" UNIQUE("business_id","name")
);
