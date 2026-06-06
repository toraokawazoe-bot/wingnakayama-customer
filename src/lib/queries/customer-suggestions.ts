import { db, maintenanceRecords, insurances, inspectionDates, vehicles, ownerships } from "@/db";
import { and, eq, inArray, isNull, like, or, asc, sql } from "drizzle-orm";
import { getBatchOilChangePredictions } from "./oil-change-prediction";
import { todayJst, daysBetween } from "@/lib/date";

export type SuggestionType = "oil" | "oil_filter" | "insurance" | "shaken" | "inspection";

export type CustomerSuggestion = {
  type: SuggestionType;
  vehicleId: number;
  vehicleLabel: string;
  title: string;
  detail: string;
  urgency: "high" | "medium";
  /** 作業マスタとのマッチング用キーワード（先頭一致優先） */
  workKeywords: string[];
};

const URGENCY_ORDER = { high: 0, medium: 1 } as const;

// カルテ（顧客詳細）に出す提案を顧客単位で算出。
// ダッシュボードのアラートと同じ判定基準＋オイルフィルター（客単価UP用）。
export async function getCustomerSuggestions(
  customerId: number
): Promise<CustomerSuggestion[]> {
  const vehicleRows = await db
    .select({
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      displacement: vehicles.displacement,
    })
    .from(ownerships)
    .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(and(eq(ownerships.customerId, customerId), isNull(ownerships.endDate)));

  if (vehicleRows.length === 0) return [];

  const vehicleIds = vehicleRows.map((v) => v.vehicleId);
  const labelOf = new Map(
    vehicleRows.map((v) => [v.vehicleId, `${v.maker} ${v.modelName ?? ""}`.trim()])
  );
  const today = todayJst();

  const [predictions, oilRecords, filterRecords, inspectionRecords, insuranceRows, inspectionDateRows, firstRecordRows] =
    await Promise.all([
      getBatchOilChangePredictions(vehicleIds),
      db
        .select({ vehicleId: maintenanceRecords.vehicleId, performedAt: maintenanceRecords.performedAt })
        .from(maintenanceRecords)
        .where(and(
          inArray(maintenanceRecords.vehicleId, vehicleIds),
          like(maintenanceRecords.workName, "%オイル交換%")
        ))
        .orderBy(asc(maintenanceRecords.performedAt)),
      db
        .select({ vehicleId: maintenanceRecords.vehicleId, performedAt: maintenanceRecords.performedAt })
        .from(maintenanceRecords)
        .where(and(
          inArray(maintenanceRecords.vehicleId, vehicleIds),
          or(
            like(maintenanceRecords.workName, "%エレメント%"),
            like(maintenanceRecords.workName, "%オイルフィルタ%")
          )
        ))
        .orderBy(asc(maintenanceRecords.performedAt)),
      db
        .select({ vehicleId: maintenanceRecords.vehicleId, performedAt: maintenanceRecords.performedAt })
        .from(maintenanceRecords)
        .where(and(
          inArray(maintenanceRecords.vehicleId, vehicleIds),
          like(maintenanceRecords.workName, "%点検%")
        ))
        .orderBy(asc(maintenanceRecords.performedAt)),
      db
        .select({ vehicleId: insurances.vehicleId, endDate: insurances.endDate })
        .from(insurances)
        .where(and(
          inArray(insurances.vehicleId, vehicleIds),
          eq(insurances.insuranceType, "compulsory")
        )),
      db
        .select({ vehicleId: inspectionDates.vehicleId, expiryDate: inspectionDates.expiryDate })
        .from(inspectionDates)
        .where(inArray(inspectionDates.vehicleId, vehicleIds)),
      // 車両ごとの最古の整備記録日（お付き合いの長さの目安。点検記録なし判定に使う）
      db
        .select({
          vehicleId: maintenanceRecords.vehicleId,
          firstAt: sql<string>`min(${maintenanceRecords.performedAt})`,
        })
        .from(maintenanceRecords)
        .where(inArray(maintenanceRecords.vehicleId, vehicleIds))
        .groupBy(maintenanceRecords.vehicleId),
    ]);

  // 車両ごとに最終日を集計
  const lastOf = (rows: { vehicleId: number; performedAt: string }[]) => {
    const m = new Map<number, string>();
    for (const r of rows) m.set(r.vehicleId, r.performedAt); // 昇順なので上書きで最終
    return m;
  };
  const lastFilter = lastOf(filterRecords);
  const lastInspection = lastOf(inspectionRecords);
  const firstRecordAt = new Map(firstRecordRows.map((r) => [r.vehicleId, r.firstAt]));

  const maxDateOf = (rows: { vehicleId: number; date: string | null }[]) => {
    const m = new Map<number, string>();
    for (const r of rows) {
      if (!r.date) continue;
      const cur = m.get(r.vehicleId);
      if (!cur || r.date > cur) m.set(r.vehicleId, r.date);
    }
    return m;
  };
  const latestInsuranceEnd = maxDateOf(insuranceRows.map((r) => ({ vehicleId: r.vehicleId, date: r.endDate })));
  const latestShakenExpiry = maxDateOf(inspectionDateRows.map((r) => ({ vehicleId: r.vehicleId, date: r.expiryDate })));

  const suggestions: CustomerSuggestion[] = [];

  for (const v of vehicleRows) {
    const label = labelOf.get(v.vehicleId)!;

    // ── オイル交換（予測エンジン）
    const pred = predictions.get(v.vehicleId);
    if (pred && pred.urgency !== "low" && pred.lastDate) {
      const detail =
        pred.stage === "predictive" && pred.predictedRemainingKm !== null
          ? `前回 ${pred.lastDate}（${pred.daysSinceLast}日前）・推定残り ${pred.predictedRemainingKm.toLocaleString()}km`
          : `前回 ${pred.lastDate}（${pred.daysSinceLast}日前）`;
      suggestions.push({
        type: "oil",
        vehicleId: v.vehicleId,
        vehicleLabel: label,
        title: "オイル交換の時期です",
        detail,
        urgency: pred.urgency,
        workKeywords: ["オイル交換"],
      });
    }

    // ── オイルフィルター（オイル交換2回に1回が目安。前回交換から1年超なら回数1回でも提案）
    const filterDate = lastFilter.get(v.vehicleId);
    const oilsSinceFilter = oilRecords.filter(
      (r) => r.vehicleId === v.vehicleId && (!filterDate || r.performedAt > filterDate)
    ).length;
    const filterAgeDays = filterDate ? daysBetween(filterDate, today) : null;
    const filterByCount = oilsSinceFilter >= 2;
    const filterByAge = filterAgeDays != null && filterAgeDays >= 365 && oilsSinceFilter >= 1;
    if (filterByCount || filterByAge) {
      suggestions.push({
        type: "oil_filter",
        vehicleId: v.vehicleId,
        vehicleLabel: label,
        title: "オイルフィルター交換のご提案",
        detail: filterDate
          ? filterByCount
            ? `前回交換 ${filterDate} から オイル交換${oilsSinceFilter}回（2回に1回が目安）`
            : `前回交換 ${filterDate} から1年以上経過`
          : `フィルター交換記録なし・オイル交換${oilsSinceFilter}回（2回に1回が目安）`,
        urgency: oilsSinceFilter >= 3 ? "high" : "medium",
        workKeywords: ["エレメント", "オイルフィルタ", "フィルタ"],
      });
    }

    // ── 自賠責（期限90日以内 or 失効）
    const insEnd = latestInsuranceEnd.get(v.vehicleId);
    if (insEnd) {
      const days = daysBetween(today, insEnd); // 負なら失効
      if (days < 0) {
        suggestions.push({
          type: "insurance",
          vehicleId: v.vehicleId,
          vehicleLabel: label,
          title: "自賠責が失効しています",
          detail: `満了日 ${insEnd}（${-days}日経過）`,
          urgency: "high",
          workKeywords: ["自賠責"],
        });
      } else if (days <= 90) {
        suggestions.push({
          type: "insurance",
          vehicleId: v.vehicleId,
          vehicleLabel: label,
          title: "自賠責の更新時期です",
          detail: `満了日 ${insEnd}（残り${days}日）`,
          urgency: days <= 30 ? "high" : "medium",
          workKeywords: ["自賠責"],
        });
      }
    }

    // ── 車検（251cc以上・期限90日以内 or 失効。満了日未登録なら登録を促す）
    if (v.displacement >= 251) {
      const expiry = latestShakenExpiry.get(v.vehicleId);
      if (!expiry) {
        // 車検対象なのに満了日が未登録 → 車検切れの見落とし防止のため登録を促す
        // （workKeywords を空にして「実施を記録」ボタンは出さない）
        suggestions.push({
          type: "shaken",
          vehicleId: v.vehicleId,
          vehicleLabel: label,
          title: "車検満了日が未登録です",
          detail: "車検証を確認して車両情報に登録してください",
          urgency: "medium",
          workKeywords: [],
        });
      }
      if (expiry) {
        const days = daysBetween(today, expiry);
        if (days < 0) {
          suggestions.push({
            type: "shaken",
            vehicleId: v.vehicleId,
            vehicleLabel: label,
            title: "車検が切れています",
            detail: `満了日 ${expiry}（${-days}日経過）`,
            urgency: "high",
            workKeywords: ["車検"],
          });
        } else if (days <= 90) {
          suggestions.push({
            type: "shaken",
            vehicleId: v.vehicleId,
            vehicleLabel: label,
            title: "車検の時期が近づいています",
            detail: `満了日 ${expiry}（残り${days}日）`,
            urgency: days <= 30 ? "high" : "medium",
            workKeywords: ["車検"],
          });
        }
      }
    }

    // ── 定期点検（180日以上未実施。点検記録ゼロでも、お付き合いが180日以上あれば提案）
    const inspAt = lastInspection.get(v.vehicleId);
    if (inspAt) {
      const days = daysBetween(inspAt, today);
      if (days >= 180) {
        suggestions.push({
          type: "inspection",
          vehicleId: v.vehicleId,
          vehicleLabel: label,
          title: "定期点検のご提案",
          detail: `前回点検 ${inspAt}（${days}日前）`,
          urgency: days >= 365 ? "high" : "medium",
          workKeywords: ["点検"],
        });
      }
    } else {
      const firstAt = firstRecordAt.get(v.vehicleId);
      if (firstAt && daysBetween(firstAt, today) >= 180) {
        suggestions.push({
          type: "inspection",
          vehicleId: v.vehicleId,
          vehicleLabel: label,
          title: "定期点検のご提案",
          detail: "点検の記録がありません（初回利用から半年以上経過）",
          urgency: "medium",
          workKeywords: ["点検"],
        });
      }
    }
  }

  return suggestions.sort(
    (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
  );
}
