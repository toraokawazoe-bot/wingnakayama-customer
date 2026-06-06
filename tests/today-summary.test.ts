import { describe, it, expect, beforeAll } from "vitest";
import {
  applyMigrations,
  seedCustomer,
  seedVehicle,
  seedMaintenance,
  seedDeal,
  seedPayment,
} from "./helpers/db";
import { getTodayMaintenanceSummary } from "@/lib/queries/maintenance";

describe("本日の来店記録: 売上集計", () => {
  let customerA: number;
  let customerB: number;

  beforeAll(async () => {
    await applyMigrations();

    // 顧客A: 今日の整備2件＋昨日の整備1件（昨日は集計外）
    customerA = await seedCustomer("整備", "顧客");
    const vehicleA = await seedVehicle(customerA);
    await seedMaintenance(vehicleA, "オイル交換", 0, 1500);
    await seedMaintenance(vehicleA, "タイヤ交換", 0, 8000);
    await seedMaintenance(vehicleA, "パンク修理", 1, 2000); // 昨日

    // 顧客B: 商談の入金（今日）＋昨日の入金（集計外）
    customerB = await seedCustomer("購入", "顧客");
    const dealB = await seedDeal(customerB, {
      totalPrice: 300000,
      maker: "ホンダ",
      modelName: "スーパーカブ",
    });
    await seedPayment(dealB, 100000, 0, "cash");
    await seedPayment(dealB, 50000, -1, "cash"); // 昨日
  });

  it("今日の整備＋今日の入金だけが合計される", async () => {
    const summary = await getTodayMaintenanceSummary();
    expect(summary.totalAmount).toBe(1500 + 8000 + 100000);
    expect(summary.recordCount).toBe(3);
  });

  it("顧客ごとにまとまり、小計が正しい", async () => {
    const summary = await getTodayMaintenanceSummary();
    const visitA = summary.visits.find((v) => v.customerId === customerA);
    const visitB = summary.visits.find((v) => v.customerId === customerB);

    expect(visitA).toBeDefined();
    expect(visitA!.subtotal).toBe(9500);
    expect(visitA!.records).toHaveLength(2);
    expect(visitA!.records.every((r) => r.kind === "maintenance")).toBe(true);

    expect(visitB).toBeDefined();
    expect(visitB!.subtotal).toBe(100000);
    expect(visitB!.records).toHaveLength(1);
    expect(visitB!.records[0].kind).toBe("payment");
    expect(visitB!.records[0].workName).toContain("入金");
    expect(visitB!.records[0].workName).toContain("現金");
    expect(visitB!.records[0].vehicleLabel).toBe("ホンダ スーパーカブ");
  });

  it("手放した車両（ownership終了）の整備は集計されない", async () => {
    const before = await getTodayMaintenanceSummary();

    const customerC = await seedCustomer("売却", "済み");
    const vehicleC = await seedVehicle(customerC);
    // 所有権を終了させる
    const { db, ownerships } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { daysFromTodayJst } = await import("@/lib/date");
    await db
      .update(ownerships)
      .set({ endDate: daysFromTodayJst(-1) })
      .where(eq(ownerships.vehicleId, vehicleC));
    await seedMaintenance(vehicleC, "オイル交換", 0, 9999);

    const after = await getTodayMaintenanceSummary();
    expect(after.totalAmount).toBe(before.totalAmount); // 9999は入らない
  });
});
