import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { customers } from "./vehicles";
import { users } from "./auth";

// 商談メモ（紙の「ご商談メモ」のデジタル版）
export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["negotiating", "contracted", "delivered", "cancelled"]
  }).default("negotiating").notNull(),
  dealDate: text("deal_date").notNull(), // 商談日 YYYY-MM-DD

  // ご希望車種
  maker: text("maker"),
  modelName: text("model_name"),
  modelCode: text("model_code"),
  color: text("color"),
  frameNumber: text("frame_number"),
  productCode: text("product_code"), // 商品コード（バーコードラベル）

  // 金額内訳（円・整数）
  vehiclePrice: integer("vehicle_price"),       // 車両本体価格
  accessoriesPrice: integer("accessories_price"), // 付属品
  insurancePrice: integer("insurance_price"),   // 自賠責保険
  registrationFee: integer("registration_fee"), // 登録・諸費用
  discount: integer("discount"),                // 値引き
  tradeInPrice: integer("trade_in_price"),      // 下取車価格
  totalPrice: integer("total_price"),           // 合計（お支払総額）

  expectedDeliveryDate: text("expected_delivery_date"), // 納期予定 YYYY-MM-DD
  staffId: text("staff_id").references(() => users.id),
  memo: text("memo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});

// 入金記録（申込金・残金など複数回の入金に対応）
export const dealPayments = sqliteTable("deal_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  paidAt: text("paid_at").notNull(), // 入金日 YYYY-MM-DD
  amount: integer("amount").notNull(), // 円・整数
  method: text("method", {
    enum: ["cash", "cashless", "loan", "other"]
  }),
  memo: text("memo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});
