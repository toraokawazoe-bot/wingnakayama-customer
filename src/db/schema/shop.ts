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
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});
