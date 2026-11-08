CREATE TABLE "square_outbox" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"variation_id" text NOT NULL,
	"kind" text NOT NULL,
	"quantity" integer NOT NULL,
	"movement_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
