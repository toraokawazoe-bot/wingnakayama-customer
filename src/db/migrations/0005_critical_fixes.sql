-- 0005_critical_fixes.sql
-- Critical 修正一括: stock_movements FK 追加 / ownerships 現所有者ユニーク制約

-- ──────────────────────────────────────────
-- C3, C5: stock_movements.maintenance_record_id に FK 追加
-- ON DELETE SET NULL: 整備記録削除時に履歴は残すが参照は外す
-- SQLite は ALTER TABLE で FK 追加できないため、テーブル再構築
-- ──────────────────────────────────────────
CREATE TABLE `stock_movements_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`part_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`quantity` integer NOT NULL,
	`maintenance_record_id` integer,
	`memo` text,
	`occurred_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`part_id`) REFERENCES `parts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`maintenance_record_id`) REFERENCES `maintenance_records`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `stock_movements_new` (`id`, `part_id`, `movement_type`, `quantity`, `maintenance_record_id`, `memo`, `occurred_at`)
SELECT `id`, `part_id`, `movement_type`, `quantity`, `maintenance_record_id`, `memo`, `occurred_at` FROM `stock_movements`;
--> statement-breakpoint
DROP TABLE `stock_movements`;
--> statement-breakpoint
ALTER TABLE `stock_movements_new` RENAME TO `stock_movements`;
--> statement-breakpoint

-- ──────────────────────────────────────────
-- C6: ownerships に現所有者ユニーク制約
-- 同一 vehicle_id で end_date IS NULL の行は最大1件
-- ──────────────────────────────────────────
CREATE UNIQUE INDEX `ownerships_vehicle_current_unique` ON `ownerships` (`vehicle_id`) WHERE `end_date` IS NULL;
