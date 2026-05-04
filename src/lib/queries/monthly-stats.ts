import { db, maintenanceRecords, workItems } from "@/db";
import { eq, sql, and, gte, lt } from "drizzle-orm";

export type WorkItemStat = {
  workItemId: number | null;
  workName: string;
  category: string | null;
  count: number;
  totalPrice: number;
};

export type MonthlySummary = {
  totalCount: number;
  totalRevenue: number;
  byCategory: { category: string; count: number }[];
};

export async function getMonthlyMaintenanceStats(
  year: number,
  month: number
): Promise<WorkItemStat[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const rows = await db
    .select({
      workItemId: maintenanceRecords.workItemId,
      workName: maintenanceRecords.workName,
      category: workItems.category,
      count: sql<number>`cast(count(*) as integer)`,
      totalPrice: sql<number>`cast(coalesce(sum(${maintenanceRecords.price}), 0) as integer)`,
    })
    .from(maintenanceRecords)
    .leftJoin(workItems, eq(maintenanceRecords.workItemId, workItems.id))
    .where(
      and(
        gte(maintenanceRecords.performedAt, from),
        lt(maintenanceRecords.performedAt, nextMonth)
      )
    )
    .groupBy(maintenanceRecords.workItemId, maintenanceRecords.workName);

  return rows.map((r) => ({
    workItemId: r.workItemId,
    workName: r.workName,
    category: r.category ?? null,
    count: r.count,
    totalPrice: r.totalPrice,
  }));
}

export async function getMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummary> {
  const stats = await getMonthlyMaintenanceStats(year, month);

  const totalCount = stats.reduce((s, r) => s + r.count, 0);
  const totalRevenue = stats.reduce((s, r) => s + r.totalPrice, 0);

  const catMap = new Map<string, number>();
  for (const r of stats) {
    const cat = r.category ?? "カスタム";
    catMap.set(cat, (catMap.get(cat) ?? 0) + r.count);
  }

  const byCategory = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return { totalCount, totalRevenue, byCategory };
}
