ALTER TABLE "movements" ADD COLUMN "staff_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "reorder_threshold" SET DEFAULT 2;--> statement-breakpoint
UPDATE "products" SET "reorder_threshold" = 2 WHERE "reorder_threshold" = 5;
