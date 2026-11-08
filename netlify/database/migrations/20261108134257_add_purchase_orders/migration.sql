CREATE TABLE "purchase_order_lines" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"qty_ordered" integer DEFAULT 0 NOT NULL,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"received_cost_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY,
	"vendor" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"sent_via" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"received_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_order_id_purchase_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE;