CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY,
	"business_id" integer NOT NULL,
	"business_name" text DEFAULT '' NOT NULL,
	"from_email" text DEFAULT '' NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"direction" text DEFAULT 'in' NOT NULL,
	"kind" text DEFAULT 'question' NOT NULL,
	"body" text NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "support_messages_business" ON "support_messages" ("business_id","created_at");