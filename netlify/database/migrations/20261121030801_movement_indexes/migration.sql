CREATE INDEX "movements_business_created" ON "movements" ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "movements_business_product" ON "movements" ("business_id","product_id");