ALTER TABLE "workflow_runs" ALTER COLUMN "upload_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD COLUMN "receipt_id" integer;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;