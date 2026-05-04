import { db, customers, vehicles, ownerships } from "@/db";
import { eq, isNull, or, like, and, desc } from "drizzle-orm";

export type CustomerWithVehicles = {
  id: number;
  lastName: string;
  firstName: string;
  lastNameKana: string | null;
  firstNameKana: string | null;
  phone: string | null;
  createdAt: Date;
  vehicles: {
    id: number;
    maker: string;
    modelName: string | null;
    plateNumber: string | null;
    displacement: number;
  }[];
};

export async function getCustomersWithVehicles(
  searchQuery?: string
): Promise<CustomerWithVehicles[]> {
  const condition = searchQuery
    ? (() => {
        const escaped = searchQuery.replace(/[%_\\]/g, "\\$&");
        const pattern = `%${escaped}%`;
        return or(
          like(customers.lastName, pattern),
          like(customers.firstName, pattern),
          like(customers.lastNameKana, pattern),
          like(customers.firstNameKana, pattern),
          like(customers.phone, pattern),
          like(vehicles.plateNumber, pattern)
        );
      })()
    : undefined;

  const rows = await db
    .select({
      customerId: customers.id,
      lastName: customers.lastName,
      firstName: customers.firstName,
      lastNameKana: customers.lastNameKana,
      firstNameKana: customers.firstNameKana,
      phone: customers.phone,
      createdAt: customers.createdAt,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      plateNumber: vehicles.plateNumber,
      displacement: vehicles.displacement,
    })
    .from(customers)
    .leftJoin(
      ownerships,
      and(eq(ownerships.customerId, customers.id), isNull(ownerships.endDate))
    )
    .leftJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(condition)
    .orderBy(desc(customers.createdAt))
    .limit(50);

  const map = new Map<number, CustomerWithVehicles>();
  for (const row of rows) {
    if (!map.has(row.customerId)) {
      map.set(row.customerId, {
        id: row.customerId,
        lastName: row.lastName,
        firstName: row.firstName,
        lastNameKana: row.lastNameKana,
        firstNameKana: row.firstNameKana,
        phone: row.phone,
        createdAt: row.createdAt,
        vehicles: [],
      });
    }
    if (row.vehicleId !== null) {
      map.get(row.customerId)!.vehicles.push({
        id: row.vehicleId,
        maker: row.maker!,
        modelName: row.modelName,
        plateNumber: row.plateNumber,
        displacement: row.displacement!,
      });
    }
  }

  return Array.from(map.values());
}
