PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer,
	`split_amount` real NOT NULL,
	`paid_by` text,
	`owed_amount` real,
	`is_settled` integer DEFAULT false NOT NULL,
	`settled_at` integer,
	`notes` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_splits`("id", "receipt_id", "split_amount", "paid_by", "owed_amount", "is_settled", "settled_at", "notes", "user_id", "created_at", "updated_at") SELECT "id", "receipt_id", "split_amount", "paid_by", "owed_amount", "is_settled", "settled_at", "notes", "user_id", "created_at", "updated_at" FROM `splits`;--> statement-breakpoint
DROP TABLE `splits`;--> statement-breakpoint
ALTER TABLE `__new_splits` RENAME TO `splits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;