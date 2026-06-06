import { auth } from "@/auth";
import { db, vehicles, maintenanceRecords } from "@/db";
import { eq, inArray } from "drizzle-orm";

export type AuthOk = { ok: true; userId: string; role: string };
export type AuthFail = { ok: false; error: string };

export async function requireAuth(): Promise<AuthOk | AuthFail> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };
  const userId = session.user.id;
  const role = session.user.role ?? "staff";
  if (!userId) return { ok: false, error: "セッションが不正です" };
  return { ok: true, userId, role };
}

export async function requireOwner(): Promise<AuthOk | AuthFail> {
  const r = await requireAuth();
  if (!r.ok) return r;
  if (r.role !== "owner") {
    return { ok: false, error: "オーナーのみ実行可能な操作です" };
  }
  return r;
}

// 単一の車両アクセス確認。多店舗化時にここに shopId 比較を追加する。
export async function assertVehicleAccess(
  vehicleId: number
): Promise<{ ok: true } | AuthFail> {
  const found = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);
  if (found.length === 0) {
    return { ok: false, error: "車両が見つかりません" };
  }
  return { ok: true };
}

// 複数 vehicleId をまとめて検証（一括登録用）
export async function assertVehiclesAccess(
  vehicleIds: number[]
): Promise<{ ok: true } | AuthFail> {
  if (vehicleIds.length === 0) return { ok: true };
  const unique = [...new Set(vehicleIds)];
  const found = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(inArray(vehicles.id, unique));
  if (found.length !== unique.length) {
    const foundIds = new Set(found.map((v) => v.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    return {
      ok: false,
      error: `存在しない車両ID: ${missing.join(", ")}`,
    };
  }
  return { ok: true };
}

// 整備記録のアクセス確認: recordId 存在確認＋紐づく vehicleId 取得。
// 多店舗化時はここで shop 境界を超えていないかチェックする。
export async function assertMaintenanceRecordAccess(
  recordId: number
): Promise<{ ok: true; vehicleId: number } | AuthFail> {
  const found = await db
    .select({
      id: maintenanceRecords.id,
      vehicleId: maintenanceRecords.vehicleId,
    })
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, recordId))
    .limit(1);
  if (found.length === 0) {
    return { ok: false, error: "整備記録が見つかりません" };
  }
  return { ok: true, vehicleId: found[0].vehicleId };
}
