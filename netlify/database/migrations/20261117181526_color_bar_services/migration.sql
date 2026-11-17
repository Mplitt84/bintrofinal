CREATE TABLE "color_bowls" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"day_key" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"service_id" integer,
	"service_name" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"lines" jsonb DEFAULT '[]' NOT NULL,
	"leftover_grams" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"charged_cents" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"minutes" integer DEFAULT 60 NOT NULL,
	"product_cents" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_business_name" UNIQUE("business_id","name")
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "labor_cents_per_hour" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "product_markup_pct" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "color_bowls_business_day" ON "color_bowls" ("business_id","day_key");