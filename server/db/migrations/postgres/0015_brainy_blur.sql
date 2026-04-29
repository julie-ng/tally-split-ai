ALTER TABLE "splits" RENAME COLUMN "user_a_share" TO "user_one_share";--> statement-breakpoint
ALTER TABLE "splits" RENAME COLUMN "user_b_share" TO "user_two_share";--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "user_one_id" uuid;--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "user_two_id" uuid;--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "paid_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "paid_by_match" text DEFAULT 'unresolved' NOT NULL;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_one_id_users_id_fk" FOREIGN KEY ("user_one_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_two_id_users_id_fk" FOREIGN KEY ("user_two_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" DROP COLUMN "paid_by";--> statement-breakpoint
ALTER TABLE "splits" DROP COLUMN "user_id";