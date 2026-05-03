import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { vehicles } from "./vehicles";

export const insurances = sqliteTable("insurances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  insuranceType: text("insurance_type", {
    enum: ["compulsory", "voluntary"]
  }).notNull(),
  companyName: text("company_name"),
  policyNumber: text("policy_number"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  memo: text("memo"),
});

export const inspectionDates = sqliteTable("inspection_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  expiryDate: text("expiry_date").notNull(),
  inspectedAt: text("inspected_at"),
  memo: text("memo"),
});
