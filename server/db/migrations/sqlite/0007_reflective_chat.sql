CREATE TABLE `receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchant_name` text,
	`merchant_address` text,
	`merchant_phone` text,
	`receipt_tags` text,
	`receipt_date` text,
	`receipt_subtotal` real,
	`receipt_tax` real,
	`receipt_total` real,
	`receipt_currency` text,
	`notes` text,
	`is_analyzed` integer DEFAULT false NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `uploads` ADD `receipt_id` integer REFERENCES receipts(id);--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_tags`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_date`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_subtotal`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_tax`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_total`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `receipt_currency`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `merchant_name`;--> statement-breakpoint
ALTER TABLE `uploads` DROP COLUMN `merchant_address`;