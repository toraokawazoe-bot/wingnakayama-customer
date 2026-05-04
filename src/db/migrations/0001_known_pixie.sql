DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "vehicles_frame_number_unique";--> statement-breakpoint
ALTER TABLE `vehicles` ALTER COLUMN "frame_number" TO "frame_number" text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_frame_number_unique` ON `vehicles` (`frame_number`);