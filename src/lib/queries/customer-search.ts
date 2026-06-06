import { db, customers, vehicles, ownerships } from "@/db";
import { or, like, and, isNull, eq, desc, inArray } from "drizzle-orm";
import { getCustomerStatsMap, type CustomerStats } from "./customer-stats";

function toKatakana(str: string): string {
  return str.replace(/[ぁ-ん]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
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

// 複数語の AND 検索:「太郎 ホンダ」は firstName=太郎 かつ vehicle.plate=ホンダ の顧客に絞る
export async function searchCustomersWithStats(
  query: string,
  limit = 10
): Promise<CustomerSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // 各単語につき: 顧客名/カナ/電話/ナンバー のいずれかに LIKE 一致
  // 全単語に対して AND でフィルタ
  const wordConditions = words.map((word) => {
    const escaped = escapeLike(word);
    const pattern = `%${escaped}%`;
    const kanaPattern = `%${toKatakana(escaped)}%`;
    return or(
      like(customers.lastName, pattern),
      like(customers.firstName, pattern),
      like(customers.lastNameKana, kanaPattern),
      like(customers.firstNameKana, kanaPattern),
      like(customers.phone, pattern),
      like(vehicles.plateNumber, pattern)
    );
  });

  // ステップ1: マッチする customerId を limit 件取得（over-fetch なし）
  const matched = await db
    .selectDistinct({ id: customers.id, createdAt: customers.createdAt })
    .from(customers)
    .leftJoin(
      ownerships,
      and(eq(ownerships.customerId, customers.id), isNull(ownerships.endDate))
    )
    .leftJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
    .where(and(...wordConditions))
    .orderBy(desc(customers.createdAt))
    .limit(limit);

  if (matched.length === 0) return [];

  const customerIds = matched.map((m) => m.id);

  // ステップ2: 顧客本体・車両・統計を並列取得
  const [customerRows, vehicleRows, statsMap] = await Promise.all([
    db
      .select({
        id: customers.id,
        lastName: customers.lastName,
        firstName: customers.firstName,
        lastNameKana: customers.lastNameKana,
        firstNameKana: customers.firstNameKana,
        phone: customers.phone,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(inArray(customers.id, customerIds))
      .orderBy(desc(customers.createdAt)),
    db
      .select({
        customerId: ownerships.customerId,
        id: vehicles.id,
        maker: vehicles.maker,
        modelName: vehicles.modelName,
        displacement: vehicles.displacement,
        plateNumber: vehicles.plateNumber,
      })
      .from(ownerships)
      .innerJoin(vehicles, eq(ownerships.vehicleId, vehicles.id))
      .where(
        and(
          inArray(ownerships.customerId, customerIds),
          isNull(ownerships.endDate)
        )
      ),
    getCustomerStatsMap(customerIds),
  ]);

  const vehiclesByCustomer = new Map<
    number,
    CustomerSearchResult["vehicles"]
  >();
  for (const v of vehicleRows) {
    if (!vehiclesByCustomer.has(v.customerId)) {
      vehiclesByCustomer.set(v.customerId, []);
    }
    vehiclesByCustomer.get(v.customerId)!.push({
      id: v.id,
      maker: v.maker,
      modelName: v.modelName,
      displacement: v.displacement,
      plateNumber: v.plateNumber,
    });
  }

  // matchedBy: 表示用に「最初の単語が何にマッチしたか」を判定
  function findMatchedBy(
    c: {
      lastName: string;
      firstName: string;
      lastNameKana: string | null;
      firstNameKana: string | null;
      phone: string | null;
    },
    word: string,
    plates: (string | null)[]
  ): CustomerSearchResult["matchedBy"] {
    const k = toKatakana(word);
    if (c.lastName.includes(word) || c.firstName.includes(word)) return "name";
    if (
      (c.lastNameKana ?? "").includes(k) ||
      (c.firstNameKana ?? "").includes(k)
    )
      return "kana";
    if ((c.phone ?? "").includes(word)) return "phone";
    if (plates.some((p) => p?.includes(word))) return "plate";
    return "name";
  }

  return customerRows.map((c) => {
    const cVehicles = vehiclesByCustomer.get(c.id) ?? [];
    return {
      id: c.id,
      lastName: c.lastName,
      firstName: c.firstName,
      lastNameKana: c.lastNameKana,
      firstNameKana: c.firstNameKana,
      phone: c.phone,
      vehicles: cVehicles,
      stats: statsMap.get(c.id) ?? {
        totalAmount: 0,
        visitCount: 0,
        lastVisitAt: null,
      },
      matchedBy: findMatchedBy(
        c,
        words[0],
        cVehicles.map((v) => v.plateNumber)
      ),
    };
  });
}
