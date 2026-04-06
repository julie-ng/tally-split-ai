CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Untitled',
	"merchant_name" text,
	"merchant_address" text,
	"merchant_phone" text,
	"tags" text,
	"date" text,
	"subtotal" real,
	"tax" real,
	"tip" real,
	"total" real,
	"currency" text,
	"notes" text,
	"split_id" integer,
	"analysis_status" text DEFAULT 'unanalyzed' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer,
	"split_amount" real NOT NULL,
	"paid_by" text,
	"user_a_share" real,
	"user_b_share" real,
	"is_settled" boolean DEFAULT false NOT NULL,
	"settled_at" timestamp,
	"notes" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"hash_id" text NOT NULL,
	"user_id" text DEFAULT 'local-dev-user' NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"receipt_id" integer,
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
	"analysis_ocr_result" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_at" timestamp,
	CONSTRAINT "uploads_hash_id_unique" UNIQUE("hash_id"),
	CONSTRAINT "uploads_blob_name_unique" UNIQUE("blob_name"),
	CONSTRAINT "uploads_blob_url_unique" UNIQUE("blob_url")
);
--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_split_id_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."splits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "splits" ADD CONSTRAINT "splits_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;