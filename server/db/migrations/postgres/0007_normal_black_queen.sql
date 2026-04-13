ALTER TABLE "receipts" ADD COLUMN "time" text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "normalize_status" text DEFAULT 'pending' NOT NULL;