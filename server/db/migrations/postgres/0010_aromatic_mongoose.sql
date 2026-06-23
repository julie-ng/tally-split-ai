DROP VIEW IF EXISTS "v_split_metrics";--> statement-breakpoint
ALTER TABLE "split_history" RENAME TO "expense_history";--> statement-breakpoint
ALTER TABLE "splits" RENAME TO "expenses";--> statement-breakpoint
ALTER TABLE "expense_history" RENAME COLUMN "split_id" TO "expense_id";--> statement-breakpoint
ALTER TABLE "workflow_runs" RENAME COLUMN "create_split_status" TO "create_expense_status";--> statement-breakpoint
ALTER TABLE "workflow_runs" RENAME COLUMN "adjust_split_status" TO "adjust_expense_status";--> statement-breakpoint
ALTER TABLE "expense_history" DROP CONSTRAINT "split_history_change_id_changes_id_fk";
--> statement-breakpoint
ALTER TABLE "expense_history" DROP CONSTRAINT "split_history_split_id_splits_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "splits_receipt_id_receipts_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "splits_household_id_households_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "splits_user_one_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "splits_user_two_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "splits_paid_by_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "splits_receipt_id_unique";--> statement-breakpoint
ALTER TABLE "expense_history" ADD CONSTRAINT "expense_history_change_id_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_history" ADD CONSTRAINT "expense_history_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_one_id_users_id_fk" FOREIGN KEY ("user_one_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_two_id_users_id_fk" FOREIGN KEY ("user_two_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_receipt_id_unique" ON "expenses" USING btree ("receipt_id") WHERE "expenses"."receipt_id" IS NOT NULL;