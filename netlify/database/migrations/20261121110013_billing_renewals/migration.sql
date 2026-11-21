ALTER TABLE "account" ADD COLUMN "paid_since" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "auto_renew_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "renewal_notice_for" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "annual_reminder_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "founding_at" timestamp;