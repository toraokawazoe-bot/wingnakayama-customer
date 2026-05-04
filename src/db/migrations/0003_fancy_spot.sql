CREATE TABLE `shop_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_name` text NOT NULL,
	`owner_name` text,
	`postal_code` text,
	`address` text,
	`phone` text,
	`email` text,
	`registration_number` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
