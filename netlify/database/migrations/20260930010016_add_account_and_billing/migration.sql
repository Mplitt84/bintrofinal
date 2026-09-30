CREATE TABLE "account" (
	"id" integer PRIMARY KEY,
	"plan" text DEFAULT 'free' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancel_reason" text DEFAULT '' NOT NULL,
	"paused_until" timestamp,
	"owner_name" text DEFAULT '' NOT NULL,
	"billing_email" text DEFAULT '' NOT NULL,
	"stripe_customer_id" text DEFAULT '' NOT NULL,
	"stripe_subscription_id" text DEFAULT '' NOT NULL,
	"card_brand" text DEFAULT '' NOT NULL,
	"card_last4" text DEFAULT '' NOT NULL,
	"card_exp_month" integer DEFAULT 0 NOT NULL,
	"card_exp_year" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
