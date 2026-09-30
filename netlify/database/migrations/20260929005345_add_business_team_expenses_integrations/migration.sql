CREATE TABLE "budgets" (
	"month" text PRIMARY KEY,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profile" (
	"id" integer PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"business_type" text DEFAULT 'salon' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"order_email" text DEFAULT '' NOT NULL,
	"monthly_budget_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY,
	"spent_on" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"vendor" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"quickbooks_id" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"provider" text PRIMARY KEY,
	"access_token" text DEFAULT '' NOT NULL,
	"refresh_token" text DEFAULT '' NOT NULL,
	"expires_at" timestamp,
	"account_id" text DEFAULT '' NOT NULL,
	"account_name" text DEFAULT '' NOT NULL,
	"pending_state" text DEFAULT '' NOT NULL,
	"last_sync_at" timestamp,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"connected_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "retail_price_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "square_variation_id" text DEFAULT '' NOT NULL;