ALTER TABLE "receipts" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "household_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "household_id" SET NOT NULL;