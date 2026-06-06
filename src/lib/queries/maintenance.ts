import { db, maintenanceRecords, workItems, vehicles, customers, ownerships, users } from "@/db";
import { deals, dealPayments } from "@/db/schema/deals";
import { eq, isNull, asc, desc, and } from "drizzle-orm";
import { todayJst } from "@/lib/date";

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

// 顧客の全車両（現所有）の整備履歴を横断取得。顧客詳細ページのインライン履歴用。
export async function getMaintenanceRecordsByCustomerId(customerId: number) {
  return db
    .select({
      id: maintenanceRecords.id,
      vehicleId: maintenanceRecords.vehicleId,
      workName: maintenanceRecords.workName,
      price: maintenanceRecords.price,
      mileage: maintenanceRecords.mileage,
      performedAt: maintenanceRecords.performedAt,
      memo: maintenanceRecords.memo,
      staffName: users.displayName,
      category: workItems.category,
      vehicleMaker: vehicles.maker,
      vehicleModelName: vehicles.modelName,
    })
    .from(maintenanceRecords)
    .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
    .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
    .leftJoin(users, eq(maintenanceRecords.staffId, users.id))
    .leftJoin(workItems, eq(maintenanceRecords.workItemId, workItems.id))
    .where(and(eq(ownerships.customerId, customerId), isNull(ownerships.endDate)))
    .orderBy(desc(maintenanceRecords.performedAt), desc(maintenanceRecords.id));
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

// 本日（JST）の整備記録＋商談の入金を顧客ごとにまとめて返す。来店受付画面の「本日の来店記録」用。
export type TodayVisitEntry = {
  customerId: number;
  customerName: string;
  records: {
    /** maintenance: 整備記録（領収書あり） / payment: 商談の入金 */
    kind: "maintenance" | "payment";
    id: number;
    workName: string;
    price: number;
    vehicleLabel: string;
    createdAt: Date;
  }[];
  subtotal: number;
};

export type TodaySummary = {
  visits: TodayVisitEntry[];
  totalAmount: number;
  recordCount: number;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  cashless: "キャッシュレス",
  loan: "クレジット・ローン",
  other: "その他",
};

export async function getTodayMaintenanceSummary(): Promise<TodaySummary> {
  const today = todayJst();

  const [rows, paymentRows] = await Promise.all([
    db
      .select({
        id: maintenanceRecords.id,
        workName: maintenanceRecords.workName,
        price: maintenanceRecords.price,
        createdAt: maintenanceRecords.createdAt,
        customerId: customers.id,
        customerLastName: customers.lastName,
        customerFirstName: customers.firstName,
        vehicleMaker: vehicles.maker,
        vehicleModelName: vehicles.modelName,
      })
      .from(maintenanceRecords)
      .innerJoin(vehicles, eq(maintenanceRecords.vehicleId, vehicles.id))
      .innerJoin(ownerships, eq(ownerships.vehicleId, vehicles.id))
      .innerJoin(customers, eq(ownerships.customerId, customers.id))
      .where(and(eq(maintenanceRecords.performedAt, today), isNull(ownerships.endDate)))
      .orderBy(desc(maintenanceRecords.createdAt), desc(maintenanceRecords.id)),
    // 商談メモの本日入金（車両販売の売上）も日次合計に含める
    db
      .select({
        id: dealPayments.id,
        amount: dealPayments.amount,
        method: dealPayments.method,
        createdAt: dealPayments.createdAt,
        customerId: customers.id,
        customerLastName: customers.lastName,
        customerFirstName: customers.firstName,
        dealMaker: deals.maker,
        dealModelName: deals.modelName,
      })
      .from(dealPayments)
      .innerJoin(deals, eq(dealPayments.dealId, deals.id))
      .innerJoin(customers, eq(deals.customerId, customers.id))
      .where(eq(dealPayments.paidAt, today))
      .orderBy(desc(dealPayments.createdAt), desc(dealPayments.id)),
  ]);

  const byCustomer = new Map<number, TodayVisitEntry>();
  let totalAmount = 0;

  const entryFor = (customerId: number, lastName: string, firstName: string) => {
    let entry = byCustomer.get(customerId);
    if (!entry) {
      entry = {
        customerId,
        customerName: `${lastName} ${firstName}`,
        records: [],
        subtotal: 0,
      };
      byCustomer.set(customerId, entry);
    }
    return entry;
  };

  for (const r of rows) {
    totalAmount += r.price;
    const entry = entryFor(r.customerId, r.customerLastName, r.customerFirstName);
    entry.records.push({
      kind: "maintenance",
      id: r.id,
      workName: r.workName,
      price: r.price,
      vehicleLabel: `${r.vehicleMaker} ${r.vehicleModelName ?? ""}`.trim(),
      createdAt: r.createdAt,
    });
    entry.subtotal += r.price;
  }

  for (const p of paymentRows) {
    totalAmount += p.amount;
    const entry = entryFor(p.customerId, p.customerLastName, p.customerFirstName);
    const methodLabel = p.method ? `（${PAYMENT_METHOD_LABEL[p.method]}）` : "";
    entry.records.push({
      kind: "payment",
      id: p.id,
      workName: `車両購入 入金${methodLabel}`,
      price: p.amount,
      vehicleLabel: [p.dealMaker, p.dealModelName].filter(Boolean).join(" ") || "車種未入力",
      createdAt: p.createdAt,
    });
    entry.subtotal += p.amount;
  }

  // 顧客内は記録の新しい順に並べ直す（整備と入金が混ざるため）
  for (const entry of byCustomer.values()) {
    entry.records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  return {
    visits: [...byCustomer.values()],
    totalAmount,
    recordCount: rows.length + paymentRows.length,
  };
}

export type WorkItem = Awaited<ReturnType<typeof getActiveWorkItems>>[number];
export type MaintenanceRecord = Awaited<ReturnType<typeof getMaintenanceRecordsByVehicleId>>[number];
export type CustomerMaintenanceRecord = Awaited<ReturnType<typeof getMaintenanceRecordsByCustomerId>>[number];
export type MaintenanceRecordDetail = NonNullable<Awaited<ReturnType<typeof getMaintenanceRecordById>>>;
export type MaintenanceRecordRaw = NonNullable<Awaited<ReturnType<typeof getMaintenanceRecordRaw>>>;
