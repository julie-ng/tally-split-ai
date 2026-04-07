CREATE TABLE "workflow_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" integer NOT NULL,
	"trigger_run_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"ocr_status" text DEFAULT 'pending' NOT NULL,
	"annotations_status" text DEFAULT 'pending' NOT NULL,
	"split_status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "uploads" RENAME COLUMN "analysis_ocr_result" TO "ocr_text";--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "ocr_json" jsonb;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "annotations_json" jsonb;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE cascade ON UPDATE no action;