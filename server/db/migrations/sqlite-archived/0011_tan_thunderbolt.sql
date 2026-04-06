CREATE TABLE `splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer,
	`split_amount` real NOT NULL,
	`paid_by` text NOT NULL,
	`owed_amount` real NOT NULL,
	`is_settled` integer DEFAULT false NOT NULL,
	`settled_at` integer,
	`notes` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE set null
);
