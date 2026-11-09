ALTER TABLE "business_profile" ADD COLUMN "order_every_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pack_size" integer DEFAULT 1 NOT NULL;