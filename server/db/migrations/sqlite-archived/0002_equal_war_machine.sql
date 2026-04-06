ALTER TABLE `uploads` ADD `hash_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uploads_hash_id_unique` ON `uploads` (`hash_id`);