import { db, customers, vehicles, ownerships } from "@/db";
import { or, like, and, isNull, eq, desc, sql } from "drizzle-orm";
import { getCustomerStatsMap, type CustomerStats } from "./customer-stats";

function toKatakana(str: string): string {
  return str.replace(/[ぁ-ん]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

export type CustomerSearchResult = {
  id: number;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  phone: string | null;
  vehicles: { id: number; maker: string; modelName: string | null; displacement: number; plateNumber: string | null }[];
  stats: CustomerStats;
  matchedBy: "name" | "kana" | "phone" | "plate";
};

export async function searchCustomersWithStats(
  query: string,
  limit = 10
): Promise<CustomerSearchResult[]> {
  if (!query.trim()) return [];

  const escaped = query.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const kanaQuery = toKatakana(escaped);
  const kanaPattern = `%${kanaQuery}%`;

  const rows = await db
    .select({
      customerId: customers.id,
      lastName: customers.lastName,
      firstName: customers.firstName,
      lastNameKana: customers.lastNameKana,
      firstNameKana: customers.firstNameKana,
      phone: customers.phone,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      displacement: vehicles.displacement,
      plateNumber: vehicles.plateNumber,
      matchedBy: sql<string>`case
        when ${customers.lastName} like ${pattern} or ${customers.firstName} like ${pattern} then 'name'
        when ${customers.lastNameKana} like ${kanaPattern} or ${customers.firstNameKana} like ${kanaPattern} then 'kana'
        when ${customers.phone} like ${pattern} then 'phone'
        when ${vehicles.plateNumber} like ${pattern} then 'plate'
        else 'name'
      end`,
    })
    .from(customers)
    .leftJoin(ownerships, and(eq(ownerships.customerId, customers.id), isNull(ownerships.endDate)))
    .leftJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(
      or(
        like(customers.lastName, pattern),
        like(customers.firstName, pattern),
        like(customers.lastNameKana, kanaPattern),
        like(customers.firstNameKana, kanaPattern),
        like(customers.phone, pattern),
        like(vehicles.plateNumber, pattern)
      )
    )
    .orderBy(desc(customers.createdAt))
    .limit(limit * 5); // over-fetch to account for grouping

  // Group by customerId
  const map = new Map<number, CustomerSearchResult>();
  for (const row of rows) {
    if (!map.has(row.customerId)) {
      map.set(row.customerId, {
        id: row.customerId,
        lastName: row.lastName,
        firstName: row.firstName,
        lastNameKana: row.lastNameKana,
        firstNameKana: row.firstNameKana,
        phone: row.phone,
        vehicles: [],
        stats: { totalAmount: 0, visitCount: 0, lastVisitAt: null },
        matchedBy: row.matchedBy as CustomerSearchResult["matchedBy"],
      });
    }
    if (row.vehicleId !== null) {
      map.get(row.customerId)!.vehicles.push({
        id: row.vehicleId,
        maker: row.maker!,
        modelName: row.modelName,
        displacement: row.displacement!,
        plateNumber: row.plateNumber,
      });
    }
  }

  const results = Array.from(map.values()).slice(0, limit);
  if (results.length === 0) return [];

  const statsMap = await getCustomerStatsMap(results.map((r) => r.id));
  for (const r of results) {
    r.stats = statsMap.get(r.id) ?? { totalAmount: 0, visitCount: 0, lastVisitAt: null };
  }

  return results;
}
