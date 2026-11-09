CREATE TABLE "stock_count_lines" (
	"id" serial PRIMARY KEY,
	"count_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"expected" integer NOT NULL,
	"counted" integer NOT NULL,
	"diff" integer NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" serial PRIMARY KEY,
	"scope" text DEFAULT '' NOT NULL,
	"blind" boolean DEFAULT false NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"items_counted" integer DEFAULT 0 NOT NULL,
	"items_changed" integer DEFAULT 0 NOT NULL,
	"units_over" integer DEFAULT 0 NOT NULL,
	"units_short" integer DEFAULT 0 NOT NULL,
	"value_diff_cents" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "last_counted_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "last_counted_by" text DEFAULT '' NOT NULL;