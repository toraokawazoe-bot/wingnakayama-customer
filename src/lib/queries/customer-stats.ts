import { db, maintenanceRecords, ownerships, workItems } from "@/db";
import { inArray, sql, eq, desc } from "drizzle-orm";

export type CustomerStats = {
  totalAmount: number;
  visitCount: number;
  lastVisitAt: string | null;
};

export async function getCustomerStatsMap(
  customerIds: number[]
): Promise<Map<number, CustomerStats>> {
  if (customerIds.length === 0) return new Map();

  // Step 1: get all vehicle IDs per customer (distinct)
  const ownershipRows = await db
    .selectDistinct({
      customerId: ownerships.customerId,
      vehicleId: ownerships.vehicleId,
    })
    .from(ownerships)
    .where(inArray(ownerships.customerId, customerIds));

  if (ownershipRows.length === 0) {
    return new Map(customerIds.map((id) => [id, { totalAmount: 0, visitCount: 0, lastVisitAt: null }]));
  }

  const vehicleIds = [...new Set(ownershipRows.map((r) => r.vehicleId))];

  // Step 2: aggregate maintenance_records per vehicle
  const statsRows = await db
    .select({
      vehicleId: maintenanceRecords.vehicleId,
      count: sql<number>`cast(count(*) as integer)`,
      total: sql<number>`cast(coalesce(sum(${maintenanceRecords.price}), 0) as integer)`,
      lastDate: sql<string | null>`max(${maintenanceRecords.performedAt})`,
    })
    .from(maintenanceRecords)
    .where(inArray(maintenanceRecords.vehicleId, vehicleIds))
    .groupBy(maintenanceRecords.vehicleId);

  const vehicleStats = new Map(statsRows.map((r) => [r.vehicleId, r]));

  // Step 3: aggregate per customer
  const customerVehicles = new Map<number, number[]>();
  for (const row of ownershipRows) {
    if (!customerVehicles.has(row.customerId)) {
      customerVehicles.set(row.customerId, []);
    }
    customerVehicles.get(row.customerId)!.push(row.vehicleId);
  }

  const result = new Map<number, CustomerStats>();
  for (const customerId of customerIds) {
    const vIds = customerVehicles.get(customerId) ?? [];
    let totalAmount = 0;
    let visitCount = 0;
    let lastVisitAt: string | null = null;

    for (const vId of vIds) {
      const s = vehicleStats.get(vId);
      if (s) {
        totalAmount += s.total;
        visitCount += s.count;
        if (s.lastDate && (!lastVisitAt || s.lastDate > lastVisitAt)) {
          lastVisitAt = s.lastDate;
        }
      }
    }

    result.set(customerId, { totalAmount, visitCount, lastVisitAt });
  }

  return result;
}

export async function getCustomerStats(customerId: number): Promise<CustomerStats> {
  const map = await getCustomerStatsMap([customerId]);
  return map.get(customerId) ?? { totalAmount: 0, visitCount: 0, lastVisitAt: null };
}

const MAJOR_CATEGORIES = ["オイル", "タイヤ", "ブレーキ", "電装", "点検", "車検"];

export type WorkCategoryHistory = {
  category: string;
  workName: string;
  performedAt: string;
  daysAgo: number;
};

export type CustomerSummary = CustomerStats & {
  majorWorkHistory: WorkCategoryHistory[];
};

export async function getCustomerSummary(customerId: number): Promise<CustomerSummary> {
  const stats = await getCustomerStats(customerId);

  const ownershipRows = await db
    .selectDistinct({ vehicleId: ownerships.vehicleId })
    .from(ownerships)
    .where(eq(ownerships.customerId, customerId));

  if (ownershipRows.length === 0) {
    return { ...stats, majorWorkHistory: [] };
  }

  const vehicleIds = ownershipRows.map((r) => r.vehicleId);

  const records = await db
    .select({
      workName: maintenanceRecords.workName,
      performedAt: maintenanceRecords.performedAt,
      category: workItems.category,
    })
    .from(maintenanceRecords)
    .leftJoin(workItems, eq(maintenanceRecords.workItemId, workItems.id))
    .where(inArray(maintenanceRecords.vehicleId, vehicleIds))
    .orderBy(desc(maintenanceRecords.performedAt));

  const today = new Date().toISOString().slice(0, 10);
  const latestByCategory = new Map<string, WorkCategoryHistory>();

  for (const r of records) {
    let category = r.category ?? null;
    if (!category) {
      // workNameからカテゴリを推測
      for (const cat of MAJOR_CATEGORIES) {
        if (r.workName.includes(cat)) { category = cat; break; }
      }
    }
    if (!category || !MAJOR_CATEGORIES.includes(category)) continue;
    if (latestByCategory.has(category)) continue; // 既に最新を取得済み

    const daysAgo = Math.round(
      (new Date(today).getTime() - new Date(r.performedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    latestByCategory.set(category, { category, workName: r.workName, performedAt: r.performedAt, daysAgo });
  }

  return {
    ...stats,
    majorWorkHistory: Array.from(latestByCategory.values()),
  };
}
