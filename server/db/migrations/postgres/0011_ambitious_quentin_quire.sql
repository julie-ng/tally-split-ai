ALTER TABLE "receipts" DROP CONSTRAINT "receipts_split_id_splits_id_fk";
--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP CONSTRAINT "workflow_runs_receipt_id_receipts_id_fk";
--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "split_id";--> statement-breakpoint
ALTER TABLE "workflow_runs" DROP COLUMN "receipt_id";