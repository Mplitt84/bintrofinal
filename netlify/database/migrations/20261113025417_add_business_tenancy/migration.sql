CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"created_by_email" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "error_reports" DROP CONSTRAINT "error_reports_message_where_unique";--> statement-breakpoint
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_name_key";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_barcode_key";--> statement-breakpoint
ALTER TABLE "profit_exclusions" DROP CONSTRAINT "profit_exclusions_product_id_list_key_unique";--> statement-breakpoint
ALTER TABLE "team_members" DROP CONSTRAINT "team_members_name_key";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_events" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profile" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_formulas" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "error_reports" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_receipts" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "formula_photos" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_emails" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "insight_reports" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "movements" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "par_changes" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "price_checks" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "profit_exclusions" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "square_outbox" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_count_lines" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "business_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_business" UNIQUE("business_id");--> statement-breakpoint
ALTER TABLE "business_profile" ADD CONSTRAINT "business_profile_business" UNIQUE("business_id");--> statement-breakpoint
ALTER TABLE "error_reports" ADD CONSTRAINT "error_reports_business_id_message_where_unique" UNIQUE("business_id","message","where");--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_business_name" UNIQUE("business_id","name");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_barcode" UNIQUE("business_id","barcode");--> statement-breakpoint
ALTER TABLE "profit_exclusions" ADD CONSTRAINT "profit_exclusions_business_id_product_id_list_key_unique" UNIQUE("business_id","product_id","list_key");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_business_name" UNIQUE("business_id","name");--> statement-breakpoint
ALTER TABLE "insight_reports" DROP CONSTRAINT "insight_reports_kind_period";--> statement-breakpoint
ALTER TABLE "insight_reports" ADD CONSTRAINT "insight_reports_kind_period" UNIQUE("business_id","kind","period_key");--> statement-breakpoint
CREATE INDEX "movements_business" ON "movements" ("business_id");--> statement-breakpoint
CREATE INDEX "products_business" ON "products" ("business_id");--> statement-breakpoint
-- The business already using this deployment becomes business 1. Every existing row
-- already points at it through the business_id default, so nothing moves.
INSERT INTO "businesses" ("id", "name", "created_by_email")
SELECT 1, COALESCE((SELECT "name" FROM "business_profile" WHERE "id" = 1), ''), ''
WHERE NOT EXISTS (SELECT 1 FROM "businesses" WHERE "id" = 1);--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('businesses', 'id'), GREATEST((SELECT MAX("id") FROM "businesses"), 1));
