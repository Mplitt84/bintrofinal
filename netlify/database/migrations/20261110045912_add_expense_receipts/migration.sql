CREATE TABLE "expense_receipts" (
	"id" serial PRIMARY KEY,
	"expense_id" integer NOT NULL UNIQUE,
	"media_type" text DEFAULT 'image/jpeg' NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "quickbooks_receipt_id" text DEFAULT '' NOT NULL;