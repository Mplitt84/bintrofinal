CREATE TABLE "color_mixes" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"color_cents" integer DEFAULT 0 NOT NULL,
	"color_oz_x100" integer DEFAULT 0 NOT NULL,
	"developer_cents" integer DEFAULT 0 NOT NULL,
	"developer_oz_x100" integer DEFAULT 0 NOT NULL,
	"color_parts_x100" integer DEFAULT 100 NOT NULL,
	"developer_parts_x100" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "color_mixes_business_name" UNIQUE("business_id","name")
);
