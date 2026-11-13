CREATE TABLE "error_reports" (
	"id" serial PRIMARY KEY,
	"message" text NOT NULL,
	"where" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"staff_name" text DEFAULT '' NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "error_reports_message_where_unique" UNIQUE("message","where")
);
