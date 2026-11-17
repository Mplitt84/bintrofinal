CREATE TABLE "client_profiles" (
	"business_id" integer DEFAULT 1 NOT NULL,
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"birthday" text DEFAULT '' NOT NULL,
	"sensitivities" text DEFAULT '' NOT NULL,
	"preferences" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"rebook_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_profiles_business_name_key" UNIQUE("business_id","name_key")
);
