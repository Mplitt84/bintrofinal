CREATE TABLE "inbound_emails" (
	"id" serial PRIMARY KEY,
	"email_id" text NOT NULL UNIQUE,
	"from_address" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'error' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"order_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "inbound_token" text DEFAULT '' NOT NULL;