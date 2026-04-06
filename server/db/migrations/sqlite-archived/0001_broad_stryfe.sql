PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'local-dev-user' NOT NULL,
	`status` text DEFAULT 'initialized' NOT NULL,
	`blob_name` text NOT NULL,
	`blob_url` text NOT NULL,
	`original_filename` text NOT NULL,
	`content_type` text,
	`size` integer,
	`uploaded_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_uploads`("id", "user_id", "status", "blob_name", "blob_url", "original_filename", "content_type", "size", "uploaded_at", "updated_at") SELECT "id", "user_id", "status", "blob_name", "blob_url", "original_filename", "content_type", "size", "uploaded_at", "updated_at" FROM `uploads`;--> statement-breakpoint
DROP TABLE `uploads`;--> statement-breakpoint
ALTER TABLE `__new_uploads` RENAME TO `uploads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uploads_blob_name_unique` ON `uploads` (`blob_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uploads_blob_url_unique` ON `uploads` (`blob_url`);