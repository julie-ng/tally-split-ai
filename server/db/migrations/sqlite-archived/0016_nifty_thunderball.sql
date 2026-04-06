ALTER TABLE `receipts` ADD `analysis_status` text DEFAULT 'unanalyzed' NOT NULL;--> statement-breakpoint
ALTER TABLE `receipts` DROP COLUMN `is_analyzed`;