import { db, maintenanceRecords, ownerships } from "@/db";
import { inArray, sql } from "drizzle-orm";

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
