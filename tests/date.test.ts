import { describe, it, expect } from "vitest";
import { todayJst, daysFromTodayJst, daysBetween, daysSinceJst, toJstDate } from "@/lib/date";

describe("date.ts（JST日付ユーティリティ）", () => {
  it("todayJst は YYYY-MM-DD 形式", () => {
    expect(todayJst()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("daysBetween: 単純な日数差", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysBetween("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysBetween("2026-06-05", "2026-06-05")).toBe(0);
  });

  it("daysBetween: 月またぎ・年またぎ・うるう年", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2); // 2024はうるう年
    expect(daysBetween("2025-02-28", "2025-03-01")).toBe(1); // 平年
  });

  it("daysSinceJst: 今日は0、daysFromTodayJst との整合", () => {
    expect(daysSinceJst(todayJst())).toBe(0);
    expect(daysSinceJst(daysFromTodayJst(-10))).toBe(10);
    expect(daysSinceJst(daysFromTodayJst(5))).toBe(-5);
  });

  it("toJstDate: UTC深夜でも日本時間の日付になる", () => {
    // UTC 2026-06-04 20:00 = JST 2026-06-05 05:00
    expect(toJstDate(new Date("2026-06-04T20:00:00Z"))).toBe("2026-06-05");
    // UTC 2026-06-04 14:00 = JST 2026-06-04 23:00
    expect(toJstDate(new Date("2026-06-04T14:00:00Z"))).toBe("2026-06-04");
  });
});
