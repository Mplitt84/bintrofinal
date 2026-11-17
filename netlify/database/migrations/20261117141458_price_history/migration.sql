CREATE TABLE "price_history" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"previous_cents" integer DEFAULT 0 NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "price_history_business_product" ON "price_history" ("business_id","product_id","recorded_at");--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Starting point for Price watch: every product's cost today, dated when it was last set.
INSERT INTO "price_history" ("business_id", "product_id", "unit_cost_cents", "previous_cents", "vendor", "source", "note", "recorded_at")
SELECT "business_id", "id", "unit_cost_cents", 0, "vendor", 'baseline', 'Cost on file when price history started', coalesce("price_updated_at", "created_at")
FROM "products" WHERE "unit_cost_cents" > 0;
