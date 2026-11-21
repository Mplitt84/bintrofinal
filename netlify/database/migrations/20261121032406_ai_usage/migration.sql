CREATE TABLE "ai_usage" (
	"business_id" integer,
	"day" text,
	"calls" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_usage_pkey" PRIMARY KEY("business_id","day")
);
