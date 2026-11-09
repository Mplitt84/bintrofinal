CREATE TABLE "connection_requests" (
	"id" serial PRIMARY KEY,
	"platform" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
