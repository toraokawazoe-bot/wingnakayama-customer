import * as fs from "node:fs";
import * as path from "node:path";
import { sql } from "drizzle-orm";
import {
  db,
  customers,
  vehicles,
  ownerships,
  maintenanceRecords,
  insurances,
  inspectionDates,
} from "@/db";
import { deals, dealPayments } from "@/db/schema/deals";
import { daysFromTodayJst } from "@/lib/date";

// src/db/migrations/*.sql を順に適用して in-memory DB にスキーマを作る。
// drizzle の「--> statement-breakpoint」区切りをそのまま使う。
export async function applyMigrations(): Promise<void> {
  const dir = path.join(process.cwd(), "src", "db", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    for (const chunk of content.split("--> statement-breakpoint")) {
      const stmt = chunk.trim();
      // コメントのみ・空のチャンクはスキップ
      const hasSql = stmt
        .split("\n")
        .some((line) => line.trim() !== "" && !line.trim().startsWith("--"));
      if (!hasSql) continue;
      await db.run(sql.raw(stmt));
    }
  }
}

export async function seedCustomer(lastName = "テスト", firstName = "太郎"): Promise<number> {
  const [c] = await db
    .insert(customers)
    .values({ lastName, firstName })
    .returning({ id: customers.id });
  return c.id;
}

// 車両＋現所有権（endDate: null）をまとめて作る
export async function seedVehicle(
  customerId: number,
  opts: { displacement?: number; maker?: string; modelName?: string } = {}
): Promise<number> {
  const [v] = await db
    .insert(vehicles)
    .values({
      maker: opts.maker ?? "ホンダ",
      modelName: opts.modelName ?? "ジョルノ",
      displacement: opts.displacement ?? 50,
    })
    .returning({ id: vehicles.id });
  await db.insert(ownerships).values({
    vehicleId: v.id,
    customerId,
    startDate: daysFromTodayJst(-1000),
    ownershipType: "new_purchase",
  });
  return v.id;
}

export async function seedMaintenance(
  vehicleId: number,
  workName: string,
  daysAgo: number,
  price = 1000
): Promise<number> {
  const [r] = await db
    .insert(maintenanceRecords)
    .values({
      vehicleId,
      workName,
      price,
      performedAt: daysFromTodayJst(-daysAgo),
    })
    .returning({ id: maintenanceRecords.id });
  return r.id;
}

export async function seedInsurance(
  vehicleId: number,
  endDateDaysFromToday: number
): Promise<void> {
  await db.insert(insurances).values({
    vehicleId,
    insuranceType: "compulsory",
    endDate: daysFromTodayJst(endDateDaysFromToday),
  });
}

export async function seedInspectionDate(
  vehicleId: number,
  expiryDaysFromToday: number
): Promise<void> {
  await db.insert(inspectionDates).values({
    vehicleId,
    expiryDate: daysFromTodayJst(expiryDaysFromToday),
  });
}

export async function seedDeal(
  customerId: number,
  opts: { totalPrice?: number | null; dealDate?: string; maker?: string; modelName?: string } = {}
): Promise<number> {
  const [d] = await db
    .insert(deals)
    .values({
      customerId,
      dealDate: opts.dealDate ?? daysFromTodayJst(0),
      totalPrice: opts.totalPrice ?? null,
      maker: opts.maker ?? null,
      modelName: opts.modelName ?? null,
    })
    .returning({ id: deals.id });
  return d.id;
}

export async function seedPayment(
  dealId: number,
  amount: number,
  paidAtDaysFromToday = 0,
  method: "cash" | "cashless" | "loan" | "other" | null = "cash"
): Promise<void> {
  await db.insert(dealPayments).values({
    dealId,
    paidAt: daysFromTodayJst(paidAtDaysFromToday),
    amount,
    method,
  });
}
