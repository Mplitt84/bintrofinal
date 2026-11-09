CREATE TABLE "app_sessions" (
	"token_hash" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"google_sub" text DEFAULT '' NOT NULL,
	"added_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_sign_in_at" timestamp
);
