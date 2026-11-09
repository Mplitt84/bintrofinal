ALTER TABLE "stock_counts" ADD COLUMN "undone_at" timestamp;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD COLUMN "undone_by" text DEFAULT '' NOT NULL;