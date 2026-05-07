ALTER TABLE "workflow_runs" ADD COLUMN "errors" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "error";