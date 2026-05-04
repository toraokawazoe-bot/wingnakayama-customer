import { db, vehicles, ownerships } from "@/db";
import { and, eq, isNull } from "drizzle-orm";

export async function getVehiclesByCustomerId(customerId: number) {
  const result = await db
    .select({
      id: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      modelCode: vehicles.modelCode,
      displacement: vehicles.displacement,
      plateNumber: vehicles.plateNumber,
      frameNumber: vehicles.frameNumber,
      color: vehicles.color,
      firstRegistrationDate: vehicles.firstRegistrationDate,
      createdAt: vehicles.createdAt,
      ownershipId: ownerships.id,
      ownershipType: ownerships.ownershipType,
      ownershipStartDate: ownerships.startDate,
    })
    .from(ownerships)
    .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(and(eq(ownerships.customerId, customerId), isNull(ownerships.endDate)));

  return result;
}

export async function getModelNameSuggestions(): Promise<string[]> {
  const result = await db
    .selectDistinct({ modelName: vehicles.modelName })
    .from(vehicles)
    .orderBy(vehicles.modelName);

  return result.flatMap((r) => (r.modelName ? [r.modelName] : []));
}

export type Vehicle = Awaited<ReturnType<typeof getVehiclesByCustomerId>>[number];
export type ModelNameSuggestion = string;
