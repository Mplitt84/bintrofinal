ALTER TABLE "business_profile" ALTER COLUMN "palette" SET DEFAULT 'burgundy-olive';--> statement-breakpoint
UPDATE "business_profile" SET "palette" = 'burgundy-olive';
