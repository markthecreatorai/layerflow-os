CREATE TABLE `content_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'Ideia' NOT NULL,
	`status` text DEFAULT 'Ideia' NOT NULL,
	`platform` text DEFAULT 'Instagram' NOT NULL,
	`pillar` text DEFAULT 'Criatividade' NOT NULL,
	`hook` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`scheduled_at` text,
	`published_at` text,
	`reach` integer DEFAULT 0 NOT NULL,
	`saves` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`parent_source_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`format` text DEFAULT 'Documento' NOT NULL,
	`status` text DEFAULT 'Rascunho' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text,
	`conversions` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_bases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`source_text` text NOT NULL,
	`thesis` text DEFAULT '' NOT NULL,
	`angles` text DEFAULT '[]' NOT NULL,
	`proofs` text DEFAULT '[]' NOT NULL,
	`objections` text DEFAULT '[]' NOT NULL,
	`cta` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Rascunho' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
