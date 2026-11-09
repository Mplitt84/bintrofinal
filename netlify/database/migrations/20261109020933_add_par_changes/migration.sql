CREATE TABLE "par_changes" (
	"id" serial PRIMARY KEY,
	"batch_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"old_par" integer NOT NULL,
	"old_max" integer NOT NULL,
	"new_par" integer NOT NULL,
	"new_max" integer NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"undone_at" timestamp
);
