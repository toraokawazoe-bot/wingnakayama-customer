import { describe, it, expect, beforeAll } from "vitest";
import { applyMigrations, seedCustomer, seedDeal, seedPayment } from "./helpers/db";
import { getDealsByCustomerId } from "@/lib/queries/deals";
import { daysFromTodayJst } from "@/lib/date";

describe("商談メモ: 入金・残金計算", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  it("入金合計と残金が正しく計算される", async () => {
    const customerId = await seedCustomer("残金", "計算");
    const dealId = await seedDeal(customerId, { totalPrice: 350000 });
    await seedPayment(dealId, 100000, -10);
    await seedPayment(dealId, 200000, -5);

    const [deal] = await getDealsByCustomerId(customerId);
    expect(deal.paidTotal).toBe(300000);
    expect(deal.remaining).toBe(50000);
    expect(deal.payments).toHaveLength(2);
  });

  it("合計金額が未入力なら残金は null（0ではない）", async () => {
    const customerId = await seedCustomer("合計", "未入力");
    const dealId = await seedDeal(customerId, { totalPrice: null });
    await seedPayment(dealId, 5000);

    const [deal] = await getDealsByCustomerId(customerId);
    expect(deal.paidTotal).toBe(5000);
    expect(deal.remaining).toBeNull();
  });

  it("入金ゼロなら残金 = 合計金額", async () => {
    const customerId = await seedCustomer("入金", "なし");
    await seedDeal(customerId, { totalPrice: 100000 });

    const [deal] = await getDealsByCustomerId(customerId);
    expect(deal.paidTotal).toBe(0);
    expect(deal.remaining).toBe(100000);
  });

  it("全額入金で残金0、過入金はマイナス表示（隠さない）", async () => {
    const customerId = await seedCustomer("全額", "入金");
    const dealId = await seedDeal(customerId, { totalPrice: 50000 });
    await seedPayment(dealId, 50000);

    const [deal] = await getDealsByCustomerId(customerId);
    expect(deal.remaining).toBe(0);

    await seedPayment(dealId, 1000); // 過入金
    const [deal2] = await getDealsByCustomerId(customerId);
    expect(deal2.remaining).toBe(-1000);
  });

  it("商談日の新しい順に並ぶ", async () => {
    const customerId = await seedCustomer("並び", "順");
    await seedDeal(customerId, { totalPrice: 1, dealDate: daysFromTodayJst(-30) });
    await seedDeal(customerId, { totalPrice: 2, dealDate: daysFromTodayJst(0) });
    await seedDeal(customerId, { totalPrice: 3, dealDate: daysFromTodayJst(-7) });

    const result = await getDealsByCustomerId(customerId);
    expect(result.map((d) => d.totalPrice)).toEqual([2, 3, 1]);
  });

  it("他の顧客の商談は混ざらない", async () => {
    const customerA = await seedCustomer("顧客", "A");
    const customerB = await seedCustomer("顧客", "B");
    await seedDeal(customerA, { totalPrice: 111 });
    await seedDeal(customerB, { totalPrice: 222 });

    const result = await getDealsByCustomerId(customerA);
    expect(result).toHaveLength(1);
    expect(result[0].totalPrice).toBe(111);
  });
});
