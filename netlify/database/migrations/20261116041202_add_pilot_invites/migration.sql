CREATE TABLE "pilot_invites" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"note" text DEFAULT '' NOT NULL,
	"invited_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp,
	"claimed_business_id" integer
);
