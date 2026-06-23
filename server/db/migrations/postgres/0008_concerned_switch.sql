ALTER TABLE "receipts" DROP CONSTRAINT "receipts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "splits" ADD COLUMN "title" text DEFAULT 'Untitled' NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "user_id";