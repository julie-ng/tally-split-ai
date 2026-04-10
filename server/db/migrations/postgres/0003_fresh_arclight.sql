CREATE TABLE "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"change_id" integer NOT NULL,
	"receipt_id" integer NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text
);
--> statement-breakpoint
CREATE TABLE "split_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"change_id" integer NOT NULL,
	"split_id" integer NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text
);
--> statement-breakpoint
ALTER TABLE "receipt_history" ADD CONSTRAINT "receipt_history_change_id_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_history" ADD CONSTRAINT "receipt_history_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_history" ADD CONSTRAINT "split_history_change_id_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_history" ADD CONSTRAINT "split_history_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE cascade ON UPDATE no action;