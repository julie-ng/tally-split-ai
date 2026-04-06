ALTER TABLE `splits` RENAME COLUMN "owed_amount" TO "user_a_debt";--> statement-breakpoint
ALTER TABLE `splits` ADD `user_b_debt` real;