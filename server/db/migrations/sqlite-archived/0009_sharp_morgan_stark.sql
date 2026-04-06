ALTER TABLE `receipts` RENAME COLUMN "receipt_tags" TO "tags";--> statement-breakpoint
ALTER TABLE `receipts` RENAME COLUMN "receipt_date" TO "date";--> statement-breakpoint
ALTER TABLE `receipts` RENAME COLUMN "receipt_subtotal" TO "subtotal";--> statement-breakpoint
ALTER TABLE `receipts` RENAME COLUMN "receipt_tax" TO "tax";--> statement-breakpoint
ALTER TABLE `receipts` RENAME COLUMN "receipt_total" TO "total";--> statement-breakpoint
ALTER TABLE `receipts` RENAME COLUMN "receipt_currency" TO "currency";