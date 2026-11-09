CREATE TABLE "integration_logs" (
	"id" serial PRIMARY KEY,
	"provider" text NOT NULL,
	"action" text DEFAULT '' NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"intuit_tid" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
