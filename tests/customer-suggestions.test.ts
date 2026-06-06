import { describe, it, expect, beforeAll } from "vitest";
import {
  applyMigrations,
  seedCustomer,
  seedVehicle,
  seedMaintenance,
  seedInsurance,
  seedInspectionDate,
} from "./helpers/db";
import { getCustomerSuggestions } from "@/lib/queries/customer-suggestions";

describe("提案エンジン", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  describe("オイルフィルター（2回に1回ルール）", () => {
    it("フィルター交換後にオイル交換2回 → 提案する", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "オイルフィルター交換", 150);
      await seedMaintenance(v, "オイル交換", 100);
      await seedMaintenance(v, "オイル交換", 10);

      const s = await getCustomerSuggestions(c);
      const filter = s.filter((x) => x.type === "oil_filter");
      expect(filter).toHaveLength(1);
      expect(filter[0].urgency).toBe("medium");
    });

    it("フィルター交換後オイル交換1回・2ヶ月経過 → 提案しない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "オイルフィルター交換", 60);
      await seedMaintenance(v, "オイル交換", 30);

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "oil_filter")).toHaveLength(0);
    });

    it("フィルター交換から1年超・オイル交換1回 → 経年ルールで提案する", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "オイルフィルター交換", 400);
      await seedMaintenance(v, "オイル交換", 30);

      const s = await getCustomerSuggestions(c);
      const filter = s.filter((x) => x.type === "oil_filter");
      expect(filter).toHaveLength(1);
      expect(filter[0].detail).toContain("1年以上");
    });

    it("オイル交換3回たまると緊急度 high", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "オイル交換", 200);
      await seedMaintenance(v, "オイル交換", 100);
      await seedMaintenance(v, "オイル交換", 10);

      const s = await getCustomerSuggestions(c);
      const filter = s.filter((x) => x.type === "oil_filter");
      expect(filter).toHaveLength(1);
      expect(filter[0].urgency).toBe("high");
    });
  });

  describe("定期点検", () => {
    it("点検記録なし・初回利用から半年以上 → 提案する", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "パンク修理", 200);

      const s = await getCustomerSuggestions(c);
      const insp = s.filter((x) => x.type === "inspection");
      expect(insp).toHaveLength(1);
      expect(insp[0].detail).toContain("記録がありません");
    });

    it("点検記録なし・初回利用から1ヶ月 → 提案しない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "パンク修理", 30);

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "inspection")).toHaveLength(0);
    });

    it("前回点検から1年超 → high で提案する", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "12ヶ月点検", 400);

      const s = await getCustomerSuggestions(c);
      const insp = s.filter((x) => x.type === "inspection");
      expect(insp).toHaveLength(1);
      expect(insp[0].urgency).toBe("high");
    });

    it("最近点検済み → 提案しない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedMaintenance(v, "12ヶ月点検", 30);

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "inspection")).toHaveLength(0);
    });
  });

  describe("車検（251cc以上）", () => {
    it("満了日未登録 → 登録を促す（記録ボタンなし = workKeywords空）", async () => {
      const c = await seedCustomer();
      await seedVehicle(c, { displacement: 400 });

      const s = await getCustomerSuggestions(c);
      const shaken = s.filter((x) => x.type === "shaken");
      expect(shaken).toHaveLength(1);
      expect(shaken[0].title).toContain("未登録");
      expect(shaken[0].workKeywords).toEqual([]);
    });

    it("満了日が30日以内 → high で提案・未登録案内は出ない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c, { displacement: 400 });
      await seedInspectionDate(v, 20);

      const s = await getCustomerSuggestions(c);
      const shaken = s.filter((x) => x.type === "shaken");
      expect(shaken).toHaveLength(1);
      expect(shaken[0].urgency).toBe("high");
      expect(shaken[0].title).not.toContain("未登録");
    });

    it("250cc以下は車検対象外 → 何も出ない", async () => {
      const c = await seedCustomer();
      await seedVehicle(c, { displacement: 125 });

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "shaken")).toHaveLength(0);
    });

    it("満了日まで半年以上 → 提案しない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c, { displacement: 400 });
      await seedInspectionDate(v, 200);

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "shaken")).toHaveLength(0);
    });
  });

  describe("自賠責", () => {
    it("満了10日前 → high", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedInsurance(v, 10);

      const s = await getCustomerSuggestions(c);
      const ins = s.filter((x) => x.type === "insurance");
      expect(ins).toHaveLength(1);
      expect(ins[0].urgency).toBe("high");
    });

    it("失効済み → high・「失効」表示", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedInsurance(v, -30);

      const s = await getCustomerSuggestions(c);
      const ins = s.filter((x) => x.type === "insurance");
      expect(ins).toHaveLength(1);
      expect(ins[0].title).toContain("失効");
    });

    it("満了まで半年 → 提案しない", async () => {
      const c = await seedCustomer();
      const v = await seedVehicle(c);
      await seedInsurance(v, 180);

      const s = await getCustomerSuggestions(c);
      expect(s.filter((x) => x.type === "insurance")).toHaveLength(0);
    });
  });

  it("車両を持たない顧客 → 提案ゼロ（エラーにならない）", async () => {
    const c = await seedCustomer();
    const s = await getCustomerSuggestions(c);
    expect(s).toEqual([]);
  });

  it("緊急度 high が先頭に並ぶ", async () => {
    const c = await seedCustomer();
    const v = await seedVehicle(c, { displacement: 400 });
    await seedInsurance(v, 10); // high
    await seedInspectionDate(v, 80); // medium（90日以内・30日超）

    const s = await getCustomerSuggestions(c);
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s[0].urgency).toBe("high");
  });
});
