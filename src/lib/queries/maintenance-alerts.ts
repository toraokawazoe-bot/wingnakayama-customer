import { db, customers, vehicles, ownerships, maintenanceRecords, insurances, inspectionDates } from "@/db";
import { eq, isNull, like, sql, lte, gte, and, lt, or } from "drizzle-orm";
import { getBatchOilChangePredictions, type OilChangePrediction } from "./oil-change-prediction";

type CustomerVehicleBase = {
  customerId: number;
  customerLastName: string;
  customerFirstName: string;
  vehicleId: number;
  vehicleMaker: string;
  vehicleModelName: string | null;
  vehiclePlateNumber: string | null;
};

// ──────────────────────────────────────────
// オイル交換アラート
// ──────────────────────────────────────────
export type OilChangeAlert = CustomerVehicleBase & {
  prediction: OilChangePrediction;
  urgency: "high" | "medium" | "low";
};

export async function getOilChangeAlerts(): Promise<OilChangeAlert[]> {
  const activeOwnerships = await db
    .select({
      customerId: ownerships.customerId,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      plateNumber: vehicles.plateNumber,
      lastName: customers.lastName,
      firstName: customers.firstName,
    })
    .from(ownerships)
    .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .innerJoin(customers, eq(ownerships.customerId, customers.id))
    .where(isNull(ownerships.endDate));

  if (activeOwnerships.length === 0) return [];

  const vehicleIds = activeOwnerships.map((o) => o.vehicleId);
  const predictions = await getBatchOilChangePredictions(vehicleIds);

  const alerts: OilChangeAlert[] = [];
  for (const o of activeOwnerships) {
    const prediction = predictions.get(o.vehicleId);
    if (!prediction || prediction.urgency === "low") continue;

    alerts.push({
      customerId: o.customerId,
      customerLastName: o.lastName,
      customerFirstName: o.firstName,
      vehicleId: o.vehicleId,
      vehicleMaker: o.maker,
      vehicleModelName: o.modelName,
      vehiclePlateNumber: o.plateNumber,
      prediction,
      urgency: prediction.urgency,
    });
  }

  // Sort: high first
  return alerts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

// ──────────────────────────────────────────
// 点検タイミングアラート
// ──────────────────────────────────────────
export type InspectionAlert = CustomerVehicleBase & {
  lastInspectionAt: string | null;
  daysSinceLast: number | null;
  urgency: "high" | "medium" | "low";
};

export async function getInspectionAlerts(): Promise<InspectionAlert[]> {
  const sixMonthsAgoStr = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const oneYearAgoMs = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      customerId: ownerships.customerId,
      lastName: customers.lastName,
      firstName: customers.firstName,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      plateNumber: vehicles.plateNumber,
      vehicleCreatedAt: vehicles.createdAt,
      lastInspectionAt: sql<string | null>`max(case when ${maintenanceRecords.workName} like '%点検%' then ${maintenanceRecords.performedAt} end)`,
    })
    .from(ownerships)
    .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .innerJoin(customers, eq(ownerships.customerId, customers.id))
    .leftJoin(maintenanceRecords, eq(maintenanceRecords.vehicleId, vehicles.id))
    .where(isNull(ownerships.endDate))
    .groupBy(vehicles.id)
    .having(
      or(
        and(
          isNull(sql`max(case when ${maintenanceRecords.workName} like '%点検%' then ${maintenanceRecords.performedAt} end)`),
          lt(vehicles.createdAt, new Date(oneYearAgoMs))
        ),
        lt(
          sql`max(case when ${maintenanceRecords.workName} like '%点検%' then ${maintenanceRecords.performedAt} end)`,
          sixMonthsAgoStr
        )
      )
    );

  return rows.map((r) => {
    const daysSinceLast = r.lastInspectionAt
      ? Math.round((new Date(today).getTime() - new Date(r.lastInspectionAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const urgency: "high" | "medium" | "low" = daysSinceLast === null ? "medium"
      : daysSinceLast >= 365 ? "high"
      : daysSinceLast >= 270 ? "medium"
      : "low";

    return {
      customerId: r.customerId,
      customerLastName: r.lastName,
      customerFirstName: r.firstName,
      vehicleId: r.vehicleId,
      vehicleMaker: r.maker,
      vehicleModelName: r.modelName,
      vehiclePlateNumber: r.plateNumber,
      lastInspectionAt: r.lastInspectionAt,
      daysSinceLast,
      urgency,
    };
  }).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

// ──────────────────────────────────────────
// 自賠責アラート
// ──────────────────────────────────────────
export type InsuranceAlert = CustomerVehicleBase & {
  endDate: string;
  daysUntilExpiry: number;
  urgency: "high" | "medium" | "low";
};

export async function getCompulsoryInsuranceAlerts(): Promise<InsuranceAlert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await db
    .select({
      customerId: ownerships.customerId,
      lastName: customers.lastName,
      firstName: customers.firstName,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      plateNumber: vehicles.plateNumber,
      endDate: insurances.endDate,
    })
    .from(insurances)
    .innerJoin(vehicles, eq(insurances.vehicleId, vehicles.id))
    .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
    .innerJoin(customers, eq(ownerships.customerId, customers.id))
    .where(
      and(
        eq(insurances.insuranceType, "compulsory"),
        gte(insurances.endDate, today),
        lte(insurances.endDate, in90Days),
        isNull(ownerships.endDate)
      )
    );

  return rows
    .filter((r): r is typeof r & { endDate: string } => r.endDate !== null)
    .map((r) => {
      const daysUntilExpiry = Math.round(
        (new Date(r.endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      );
      const urgency: "high" | "medium" | "low" =
        daysUntilExpiry <= 30 ? "high" : daysUntilExpiry <= 60 ? "medium" : "low";
      return {
        customerId: r.customerId,
        customerLastName: r.lastName,
        customerFirstName: r.firstName,
        vehicleId: r.vehicleId,
        vehicleMaker: r.maker,
        vehicleModelName: r.modelName,
        vehiclePlateNumber: r.plateNumber,
        endDate: r.endDate,
        daysUntilExpiry,
        urgency,
      };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ──────────────────────────────────────────
// 車検満了アラート（251cc以上）
// ──────────────────────────────────────────
export type InspectionExpiryAlert = CustomerVehicleBase & {
  expiryDate: string;
  daysUntilExpiry: number;
  displacement: number;
  urgency: "high" | "medium" | "low";
};

export async function getInspectionExpiryAlerts(): Promise<InspectionExpiryAlert[]> {
  const today = new Date().toISOString().slice(0, 10);
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await db
    .select({
      customerId: ownerships.customerId,
      lastName: customers.lastName,
      firstName: customers.firstName,
      vehicleId: vehicles.id,
      maker: vehicles.maker,
      modelName: vehicles.modelName,
      plateNumber: vehicles.plateNumber,
      displacement: vehicles.displacement,
      expiryDate: inspectionDates.expiryDate,
    })
    .from(inspectionDates)
    .innerJoin(vehicles, eq(inspectionDates.vehicleId, vehicles.id))
    .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
    .innerJoin(customers, eq(ownerships.customerId, customers.id))
    .where(
      and(
        gte(inspectionDates.expiryDate, today),
        lte(inspectionDates.expiryDate, in90Days),
        isNull(ownerships.endDate),
        gte(vehicles.displacement, 251)
      )
    );

  return rows.map((r) => {
    const daysUntilExpiry = Math.round(
      (new Date(r.expiryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    const urgency: "high" | "medium" | "low" =
      daysUntilExpiry <= 30 ? "high" : daysUntilExpiry <= 60 ? "medium" : "low";
    return {
      customerId: r.customerId,
      customerLastName: r.lastName,
      customerFirstName: r.firstName,
      vehicleId: r.vehicleId,
      vehicleMaker: r.maker,
      vehicleModelName: r.modelName,
      vehiclePlateNumber: r.plateNumber,
      displacement: r.displacement,
      expiryDate: r.expiryDate,
      daysUntilExpiry,
      urgency,
    };
  }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ──────────────────────────────────────────
// 長期未来店アラート
// ──────────────────────────────────────────
export type DormantCustomerAlert = {
  customerId: number;
  customerLastName: string;
  customerFirstName: string;
  lastVisitAt: string | null;
  daysSinceLast: number | null;
  urgency: "high" | "medium" | "low";
};

export async function getDormantCustomerAlerts(): Promise<DormantCustomerAlert[]> {
  const sixMonthsAgoStr = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sixMonthsAgoDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      customerId: customers.id,
      lastName: customers.lastName,
      firstName: customers.firstName,
      createdAt: customers.createdAt,
      lastVisitAt: sql<string | null>`max(${maintenanceRecords.performedAt})`,
    })
    .from(customers)
    .leftJoin(ownerships, eq(ownerships.customerId, customers.id))
    .leftJoin(maintenanceRecords, eq(maintenanceRecords.vehicleId, ownerships.vehicleId))
    .groupBy(customers.id)
    .having(
      or(
        and(
          isNull(sql`max(${maintenanceRecords.performedAt})`),
          lt(customers.createdAt, sixMonthsAgoDate)
        ),
        lt(sql`max(${maintenanceRecords.performedAt})`, sixMonthsAgoStr)
      )
    );

  return rows.map((r) => {
    const daysSinceLast = r.lastVisitAt
      ? Math.round((new Date(today).getTime() - new Date(r.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const urgency: "high" | "medium" | "low" =
      daysSinceLast === null ? "medium"
      : daysSinceLast >= 365 ? "high"
      : "medium";

    return {
      customerId: r.customerId,
      customerLastName: r.lastName,
      customerFirstName: r.firstName,
      lastVisitAt: r.lastVisitAt,
      daysSinceLast,
      urgency,
    };
  }).sort((a, b) => {
    if (a.lastVisitAt === null && b.lastVisitAt === null) return 0;
    if (a.lastVisitAt === null) return -1;
    if (b.lastVisitAt === null) return 1;
    return a.lastVisitAt < b.lastVisitAt ? -1 : 1;
  });
}
