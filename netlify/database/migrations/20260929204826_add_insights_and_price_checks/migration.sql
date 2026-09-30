CREATE TABLE "insight_reports" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"period_key" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"emailed_to" text DEFAULT '' NOT NULL,
	"emailed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "insight_reports_kind_period" UNIQUE("kind","period_key")
);
--> statement-breakpoint
CREATE TABLE "price_checks" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"retail_price_cents" integer DEFAULT 0 NOT NULL,
	"source_name" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"source_type" text DEFAULT 'estimate' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "weekly_report_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "monthly_report_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "fast_mover_alert_email" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "price_checks" ADD CONSTRAINT "price_checks_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;