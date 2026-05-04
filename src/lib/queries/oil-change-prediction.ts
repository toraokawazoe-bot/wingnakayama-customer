import { db, maintenanceRecords } from "@/db";
import { eq, like, asc, and, inArray } from "drizzle-orm";

export type OilChangePrediction =
  | { stage: "no-data"; lastDate: null; urgency: "low" }
  | { stage: "initial"; lastDate: string; daysSinceLast: number; urgency: "high" | "medium" | "low" }
  | {
      stage: "predictive";
      lastDate: string;
      daysSinceLast: number;
      predictedRemainingKm: number | null;
      predictedRemainingDays: number;
      urgency: "high" | "medium" | "low";
    };

function calcUrgency(daysSinceLast: number, remainingKm: number | null): "high" | "medium" | "low" {
  if (daysSinceLast >= 120) return "high";
  if (daysSinceLast >= 90) return "medium";
  if (remainingKm !== null) {
    if (remainingKm <= 200) return "high";
    if (remainingKm <= 500) return "medium";
  }
  return "low";
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getOilChangePrediction(vehicleId: number): Promise<OilChangePrediction> {
  const records = await db
    .select({
      performedAt: maintenanceRecords.performedAt,
      mileage: maintenanceRecords.mileage,
    })
    .from(maintenanceRecords)
    .where(
      and(
        eq(maintenanceRecords.vehicleId, vehicleId),
        like(maintenanceRecords.workName, "%オイル交換%")
      )
    )
    .orderBy(asc(maintenanceRecords.performedAt));

  if (records.length === 0) {
    return { stage: "no-data", lastDate: null, urgency: "low" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const lastRecord = records[records.length - 1];
  const daysSinceLast = daysBetween(lastRecord.performedAt, today);

  if (records.length <= 2) {
    return {
      stage: "initial",
      lastDate: lastRecord.performedAt,
      daysSinceLast,
      urgency: calcUrgency(daysSinceLast, null),
    };
  }

  // Calculate average interval and km/day
  const intervals: number[] = [];
  const kmPerDay: number[] = [];

  for (let i = 1; i < records.length; i++) {
    const days = daysBetween(records[i - 1].performedAt, records[i].performedAt);
    if (days > 0) intervals.push(days);

    const prevMileage = records[i - 1].mileage;
    const currMileage = records[i].mileage;
    if (prevMileage !== null && currMileage !== null && days > 0) {
      const kmDiff = currMileage - prevMileage;
      if (kmDiff > 0) kmPerDay.push(kmDiff / days);
    }
  }

  const avgInterval = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 90;

  const predictedRemainingDays = Math.max(0, Math.round(avgInterval - daysSinceLast));

  let predictedRemainingKm: number | null = null;
  if (kmPerDay.length > 0) {
    const avgKmPerDay = kmPerDay.reduce((a, b) => a + b, 0) / kmPerDay.length;
    const estimatedKmDriven = Math.round(avgKmPerDay * daysSinceLast);
    predictedRemainingKm = Math.max(0, 1500 - estimatedKmDriven);
  }

  return {
    stage: "predictive",
    lastDate: lastRecord.performedAt,
    daysSinceLast,
    predictedRemainingKm,
    predictedRemainingDays,
    urgency: calcUrgency(daysSinceLast, predictedRemainingKm),
  };
}

export async function getBatchOilChangePredictions(
  vehicleIds: number[]
): Promise<Map<number, OilChangePrediction>> {
  if (vehicleIds.length === 0) return new Map();

  const records = await db
    .select({
      vehicleId: maintenanceRecords.vehicleId,
      performedAt: maintenanceRecords.performedAt,
      mileage: maintenanceRecords.mileage,
    })
    .from(maintenanceRecords)
    .where(
      and(
        inArray(maintenanceRecords.vehicleId, vehicleIds),
        like(maintenanceRecords.workName, "%オイル交換%")
      )
    )
    .orderBy(asc(maintenanceRecords.performedAt));

  // Group by vehicleId
  const grouped = new Map<number, typeof records>();
  for (const r of records) {
    if (!grouped.has(r.vehicleId)) grouped.set(r.vehicleId, []);
    grouped.get(r.vehicleId)!.push(r);
  }

  const today = new Date().toISOString().slice(0, 10);
  const result = new Map<number, OilChangePrediction>();

  for (const vehicleId of vehicleIds) {
    const recs = grouped.get(vehicleId) ?? [];

    if (recs.length === 0) {
      result.set(vehicleId, { stage: "no-data", lastDate: null, urgency: "low" });
      continue;
    }

    const lastRecord = recs[recs.length - 1];
    const daysSinceLast = daysBetween(lastRecord.performedAt, today);

    if (recs.length <= 2) {
      result.set(vehicleId, {
        stage: "initial",
        lastDate: lastRecord.performedAt,
        daysSinceLast,
        urgency: calcUrgency(daysSinceLast, null),
      });
      continue;
    }

    const intervals: number[] = [];
    const kmPerDay: number[] = [];
    for (let i = 1; i < recs.length; i++) {
      const days = daysBetween(recs[i - 1].performedAt, recs[i].performedAt);
      if (days > 0) intervals.push(days);
      const pm = recs[i - 1].mileage, cm = recs[i].mileage;
      if (pm !== null && cm !== null && days > 0 && cm - pm > 0) {
        kmPerDay.push((cm - pm) / days);
      }
    }

    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 90;
    const predictedRemainingDays = Math.max(0, Math.round(avgInterval - daysSinceLast));

    let predictedRemainingKm: number | null = null;
    if (kmPerDay.length > 0) {
      const avg = kmPerDay.reduce((a, b) => a + b, 0) / kmPerDay.length;
      predictedRemainingKm = Math.max(0, 1500 - Math.round(avg * daysSinceLast));
    }

    result.set(vehicleId, {
      stage: "predictive",
      lastDate: lastRecord.performedAt,
      daysSinceLast,
      predictedRemainingKm,
      predictedRemainingDays,
      urgency: calcUrgency(daysSinceLast, predictedRemainingKm),
    });
  }

  return result;
}
