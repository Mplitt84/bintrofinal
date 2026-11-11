CREATE TABLE "profit_exclusions" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"list_key" text NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profit_exclusions_product_id_list_key_unique" UNIQUE("product_id","list_key")
);
