import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const shopSettings = sqliteTable("shop_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name"),
  postalCode: text("postal_code"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  registrationNumber: text("registration_number"),
  taxMode: text("tax_mode", { enum: ["inclusive", "exclusive", "none"] }).default("inclusive").notNull(),
  taxRate: integer("tax_rate").default(10).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});
