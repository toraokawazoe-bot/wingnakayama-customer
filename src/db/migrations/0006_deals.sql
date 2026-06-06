CREATE TABLE IF NOT EXISTS `deals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`status` text DEFAULT 'negotiating' NOT NULL,
	`deal_date` text NOT NULL,
	`maker` text,
	`model_name` text,
	`model_code` text,
	`color` text,
	`frame_number` text,
	`product_code` text,
	`vehicle_price` integer,
	`accessories_price` integer,
	`insurance_price` integer,
	`registration_fee` integer,
	`discount` integer,
	`trade_in_price` integer,
	`total_price` integer,
	`expected_delivery_date` text,
	`staff_id` text,
	`memo` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deal_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deal_id` integer NOT NULL,
	`paid_at` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text,
	`memo` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deals_customer_id` ON `deals` (`customer_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_deal_payments_deal_id` ON `deal_payments` (`deal_id`);
