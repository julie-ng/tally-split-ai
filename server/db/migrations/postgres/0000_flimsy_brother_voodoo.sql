CREATE TABLE "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_version" text,
	"confidence" real,
	"reasoning" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"change_id" integer NOT NULL,
	"receipt_id" text,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"confidence" real
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Untitled',
	"merchant_name" text,
	"merchant_address" text,
	"merchant_phone" text,
	"tags" text,
	"date" text,
	"time" text,
	"subtotal" real,
	"tax" real,
	"tip" real,
	"total" real,
	"currency" text,
	"notes" text,
	"analysis_status" text DEFAULT 'unanalyzed' NOT NULL,
	"user_id" text NOT NULL,
	"household_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"change_id" integer NOT NULL,
	"split_id" text,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"confidence" real
);
--> statement-breakpoint
CREATE TABLE "splits" (
	"id" text PRIMARY KEY NOT NULL,
	"receipt_id" text,
	"split_amount" real NOT NULL,
	"user_one_share" real,
	"user_two_share" real,
	"user_one_id" text,
	"user_two_id" text,
	"paid_by_user_id" text,
	"paid_by_match" text DEFAULT 'unresolved' NOT NULL,
	"is_settled" boolean DEFAULT false NOT NULL,
	"settled_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"receipt_id" text,
	"status" text DEFAULT 'initialized' NOT NULL,
	"blob_name" text NOT NULL,
	"blob_url" text NOT NULL,
	"thumbnail_name" text,
	"thumbnail_url" text,
	"original_filename" text NOT NULL,
	"content_type" text,
	"size" integer,
	"azure_tags" jsonb,
	"analysis_status" text DEFAULT 'pending',
	"analyzed_at" timestamp,
	"ocr_text" text,
	"ocr_json" jsonb,
	"annotations_json" jsonb,
	"household_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_at" timestamp,
	CONSTRAINT "uploads_blob_name_unique" UNIQUE("blob_name"),
	CONSTRAINT "uploads_blob_url_unique" UNIQUE("blob_url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" bigint NOT NULL,
	"household_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"initials" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" text,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"trigger_run_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"ocr_status" text DEFAULT 'pending' NOT NULL,
	"annotations_status" text DEFAULT 'pending' NOT NULL,
	"create_split_status" text DEFAULT 'pending' NOT NULL,
	"adjust_split_status" text DEFAULT 'pending' NOT NULL,
	"normalize_status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "receipt_history" ADD CONSTRAINT "receipt_history_change_id_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_history" ADD CONSTRAINT "receipt_history_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_history" ADD CONSTRAINT "split_history_change_id_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_history" ADD CONSTRAINT "split_history_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_one_id_users_id_fk" FOREIGN KEY ("user_one_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_two_id_users_id_fk" FOREIGN KEY ("user_two_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_github_id_idx" ON "users" USING btree ("github_id");