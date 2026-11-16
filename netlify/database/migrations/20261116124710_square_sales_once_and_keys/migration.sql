CREATE TABLE "square_synced_orders" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"order_id" text NOT NULL,
	"closed_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"checked_movements" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "square_synced_orders_business_order" UNIQUE("business_id","order_id")
);
--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_pkey";--> statement-breakpoint
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_pkey";--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_business_month" PRIMARY KEY("business_id","month");--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_business_provider" PRIMARY KEY("business_id","provider");