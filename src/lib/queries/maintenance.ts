import { db, maintenanceRecords, workItems, vehicles, customers, ownerships, users } from "@/db";
import { eq, isNull, asc, desc, and } from "drizzle-orm";

export async function getActiveWorkItems() {
  return db
    .select()
    .from(workItems)
    .where(eq(workItems.isActive, true))
    .orderBy(asc(workItems.displayOrder));
}

export async function getMaintenanceRecordsByVehicleId(vehicleId: number) {
  return db
    .select({
      id: maintenanceRecords.id,
      vehicleId: maintenanceRecords.vehicleId,
      workItemId: maintenanceRecords.workItemId,
      workName: maintenanceRecords.workName,
      price: maintenanceRecords.price,
      mileage: maintenanceRecords.mileage,
      performedAt: maintenanceRecords.performedAt,
      memo: maintenanceRecords.memo,
      createdAt: maintenanceRecords.createdAt,
      staffName: users.displayName,
      category: workItems.category,
    })
    .from(maintenanceRecords)
    .leftJoin(users, eq(maintenanceRecords.staffId, users.id))
    .leftJoin(workItems, eq(maintenanceRecords.workItemId, workItems.id))
    .where(eq(maintenanceRecords.vehicleId, vehicleId))
    .orderBy(desc(maintenanceRecords.performedAt));
}

export async function getMaintenanceRecordById(id: number) {
  const result = await db
    .select({
      id: maintenanceRecords.id,
      workName: maintenanceRecords.workName,
      price: maintenanceRecords.price,
      mileage: maintenanceRecords.mileage,
      performedAt: maintenanceRecords.performedAt,
      memo: maintenanceRecords.memo,
      createdAt: maintenanceRecords.createdAt,
      vehicleId: vehicles.id,
      vehicleMaker: vehicles.maker,
      vehicleModelName: vehicles.modelName,
      vehiclePlateNumber: vehicles.plateNumber,
      vehicleDisplacement: vehicles.displacement,
      customerId: customers.id,
      customerLastName: customers.lastName,
      customerFirstName: customers.firstName,
      staffName: users.displayName,
    })
    .from(maintenanceRecords)
    .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
    .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
    .innerJoin(customers, eq(ownerships.customerId, customers.id))
    .leftJoin(users, eq(maintenanceRecords.staffId, users.id))
    .where(and(eq(maintenanceRecords.id, id), isNull(ownerships.endDate)))
    .limit(1);

  return result[0] ?? null;
}

export async function getMaintenanceRecordRaw(id: number) {
  const result = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, id))
    .limit(1);
  return result[0] ?? null;
}

export type WorkItem = Awaited<ReturnType<typeof getActiveWorkItems>>[number];
export type MaintenanceRecord = Awaited<ReturnType<typeof getMaintenanceRecordsByVehicleId>>[number];
export type MaintenanceRecordDetail = NonNullable<Awaited<ReturnType<typeof getMaintenanceRecordById>>>;
export type MaintenanceRecordRaw = NonNullable<Awaited<ReturnType<typeof getMaintenanceRecordRaw>>>;
