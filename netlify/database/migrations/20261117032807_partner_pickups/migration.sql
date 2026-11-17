ALTER TABLE "sustainability_partners" ADD COLUMN "pickup_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sustainability_partners" ADD COLUMN "pickup_day" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sustainability_partners" ADD COLUMN "affiliate_of" text DEFAULT '' NOT NULL;