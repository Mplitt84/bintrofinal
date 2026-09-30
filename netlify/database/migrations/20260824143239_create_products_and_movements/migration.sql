CREATE TABLE "movements" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"type" text NOT NULL,
	"delta" integer NOT NULL,
	"staff_initials" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"barcode" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 5 NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");