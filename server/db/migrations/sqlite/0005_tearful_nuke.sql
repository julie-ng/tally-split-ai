ALTER TABLE `uploads` ADD `title` text DEFAULT 'Untitled' NOT NULL;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_tags` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_date` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_subtotal` real;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_tax` real;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_total` real;--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_currency` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `merchant_name` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `merchant_address` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `analysis_status` text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `uploads` ADD `analyzed_at` integer;--> statement-breakpoint
ALTER TABLE `uploads` ADD `analysis_ocr_result` text;