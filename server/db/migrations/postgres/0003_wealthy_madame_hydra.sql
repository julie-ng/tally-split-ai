ALTER TABLE "receipt_history" DROP CONSTRAINT "receipt_history_receipt_id_receipts_id_fk";
--> statement-breakpoint
ALTER TABLE "split_history" DROP CONSTRAINT "split_history_split_id_splits_id_fk";
--> statement-breakpoint
ALTER TABLE "splits" DROP CONSTRAINT "splits_receipt_id_receipts_id_fk";
--> statement-breakpoint
ALTER TABLE "receipt_history" ADD CONSTRAINT "receipt_history_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_history" ADD CONSTRAINT "split_history_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;