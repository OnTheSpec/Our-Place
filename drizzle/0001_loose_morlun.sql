CREATE TABLE `commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`extracted_item_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text DEFAULT 'claimed' NOT NULL,
	`promised_for` integer,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`extracted_item_id`) REFERENCES `extracted_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `family_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`check_in_id` text NOT NULL,
	`author_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`audio_object_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_in_id`) REFERENCES `check_ins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `people` ADD `daily_check_in_time` text;