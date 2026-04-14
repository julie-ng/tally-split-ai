ALTER TABLE "changes" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "changes" ADD COLUMN "reasoning" text;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "adjust_split_status" text DEFAULT 'pending' NOT NULL;