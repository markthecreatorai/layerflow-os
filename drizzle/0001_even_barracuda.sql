CREATE TABLE `brand_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`platform` text DEFAULT 'Instagram' NOT NULL,
	`initials` text DEFAULT 'IG' NOT NULL,
	`accent` text DEFAULT '#B8FF6A' NOT NULL,
	`connection_status` text DEFAULT 'Planejamento' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `account_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `account_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `storage_key` text;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `file_name` text;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `mime_type` text;--> statement-breakpoint
ALTER TABLE `library_assets` ADD `file_size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `source_bases` ADD `account_id` integer DEFAULT 1 NOT NULL;