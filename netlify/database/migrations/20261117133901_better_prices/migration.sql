CREATE TABLE "price_alternatives" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"seller_name" text NOT NULL,
	"seller_url" text DEFAULT '' NOT NULL,
	"seller_type" text DEFAULT 'distributor' NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"current_cost_cents" integer DEFAULT 0 NOT NULL,
	"current_vendor" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"found_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp,
	"decided_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "buying_preference" text DEFAULT 'pro' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seller_scan_at" timestamp;--> statement-breakpoint
ALTER TABLE "price_alternatives" ADD CONSTRAINT "price_alternatives_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;