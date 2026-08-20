CREATE TABLE `instagram_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_email` text NOT NULL,
	`account_id` integer NOT NULL,
	`instagram_user_id` text NOT NULL,
	`username` text NOT NULL,
	`account_type` text DEFAULT 'PROFESSIONAL' NOT NULL,
	`profile_picture_url` text,
	`token_ciphertext` text NOT NULL,
	`token_iv` text NOT NULL,
	`token_expires_at` text NOT NULL,
	`status` text DEFAULT 'Conectado' NOT NULL,
	`followers_count` integer DEFAULT 0 NOT NULL,
	`media_count` integer DEFAULT 0 NOT NULL,
	`reach_30d` integer DEFAULT 0 NOT NULL,
	`views_30d` integer DEFAULT 0 NOT NULL,
	`profile_views_30d` integer DEFAULT 0 NOT NULL,
	`interactions_30d` integer DEFAULT 0 NOT NULL,
	`last_synced_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instagram_connections_account_id_unique` ON `instagram_connections` (`account_id`);--> statement-breakpoint
CREATE TABLE `instagram_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL,
	`instagram_media_id` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`media_type` text DEFAULT 'IMAGE' NOT NULL,
	`permalink` text DEFAULT '' NOT NULL,
	`published_at` text NOT NULL,
	`reach` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`shares` integer DEFAULT 0 NOT NULL,
	`total_interactions` integer DEFAULT 0 NOT NULL,
	`synced_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instagram_media_instagram_media_id_unique` ON `instagram_media` (`instagram_media_id`);--> statement-breakpoint
CREATE TABLE `instagram_oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`account_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
