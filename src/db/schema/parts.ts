import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { workItems } from "./maintenance";

export const parts = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"),
  sku: text("sku"),
  supplier: text("supplier"),
  purchasePrice: integer("purchase_price"),
  sellingPrice: integer("selling_price"),
  currentStock: integer("current_stock").default(0).notNull(),
  minStock: integer("min_stock").default(0).notNull(),
  unit: text("unit").default("個").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  memo: text("memo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});

export const workItemParts = sqliteTable("work_item_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workItemId: integer("work_item_id").notNull().references(() => workItems.id, { onDelete: "cascade" }),
  partId: integer("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
});

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull().references(() => parts.id, { onDelete: "cascade" }),
  movementType: text("movement_type", { enum: ["in", "out", "adjust"] }).notNull(),
  quantity: integer("quantity").notNull(),
  maintenanceRecordId: integer("maintenance_record_id"),
  memo: text("memo"),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).default(sql`(unixepoch() * 1000)`).notNull(),
});
