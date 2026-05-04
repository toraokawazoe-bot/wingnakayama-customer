import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  lastNameKana: text("last_name_kana"),
  firstNameKana: text("first_name_kana"),
  postalCode: text("postal_code"),
  prefecture: text("prefecture"),
  city: text("city"),
  addressLine: text("address_line"),
  phone: text("phone"),
  email: text("email"),
  birthday: text("birthday"),
  referrerCustomerId: integer("referrer_customer_id"),
  memo: text("memo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  frameNumber: text("frame_number").unique(),
  maker: text("maker").notNull(),
  modelName: text("model_name"),
  modelCode: text("model_code"),
  displacement: integer("displacement").notNull(),
  firstRegistrationDate: text("first_registration_date"),
  plateNumber: text("plate_number"),
  engineModel: text("engine_model"),
  color: text("color"),
  purchaseMileage: integer("purchase_mileage"),
  purchaseSource: text("purchase_source", {
    enum: ["own_sale", "other_shop", "used_purchase", "unknown"]
  }),
  primaryStaffId: text("primary_staff_id").references(() => users.id),
  memo: text("memo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
});

export const ownerships = sqliteTable("ownerships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  ownershipType: text("ownership_type", {
    enum: ["new_purchase", "used_purchase", "transferred_in", "transferred_out"]
  }).notNull(),
  memo: text("memo"),
});

export const vehicleDocuments = sqliteTable("vehicle_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  documentType: text("document_type", {
    enum: ["license_certificate", "registration_certificate", "light_vehicle_notification"]
  }).notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp_ms" })
    .default(sql`(unixepoch() * 1000)`).notNull(),
  memo: text("memo"),
});
