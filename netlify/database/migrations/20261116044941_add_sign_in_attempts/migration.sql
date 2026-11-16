CREATE TABLE "sign_in_attempts" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sign_in_attempts_email" ON "sign_in_attempts" ("email");