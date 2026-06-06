"use server";

import { db, maintenanceRecords, workItems, workItemParts, parts, stockMovements } from "@/db";
import { eq, sql } from "drizzle-orm";
import {
  requireAuth,
  requireOwner,
  assertVehicleAccess,
  assertMaintenanceRecordAccess,
} from "@/lib/auth-guards";
import { todayJst } from "@/lib/date";
import { revalidatePath } from "next/cache";

export type QuickAddResult =
  | { ok: true; recordId: number }
  | { ok: false; error: string };

export async function quickAddMaintenanceAction(
  vehicleId: number,
  customerId: number,
  workItemId: number
): Promise<QuickAddResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const vehicleAccess = await assertVehicleAccess(vehicleId);
  if (!vehicleAccess.ok) return vehicleAccess;

  const staffId = authResult.userId;

  const item = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, workItemId))
    .limit(1);

  if (item.length === 0) {
    return { ok: false, error: "作業マスタが見つかりません" };
  }

  const today = todayJst();

  try {
    const insertedId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(maintenanceRecords)
        .values({
          vehicleId,
          workItemId: item[0].id,
          workName: item[0].name,
          price: item[0].defaultPrice,
          performedAt: today,
          staffId,
        })
        .returning({ id: maintenanceRecords.id });

      const linkedParts = await tx
        .select({ partId: workItemParts.partId, quantity: workItemParts.quantity })
        .from(workItemParts)
        .where(eq(workItemParts.workItemId, item[0].id));

      for (const lp of linkedParts) {
        await tx
          .update(parts)
          .set({ currentStock: sql`${parts.currentStock} - ${lp.quantity}` })
          .where(eq(parts.id, lp.partId));
        await tx.insert(stockMovements).values({
          partId: lp.partId,
          movementType: "out",
          quantity: -lp.quantity,
          maintenanceRecordId: inserted.id,
          memo: `自動消費: ${item[0].name}`,
        });
      }

      return inserted.id;
    });

    revalidatePath(`/customers/${customerId}/vehicles/${vehicleId}/maintenance`);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/customers`);
    revalidatePath(`/settings/parts`);
    revalidatePath(`/`);

    return { ok: true, recordId: insertedId };
  } catch (error) {
    console.error("[quickAddMaintenanceAction] DB insert failed:", error);
    return { ok: false, error: "記録に失敗しました。もう一度お試しください。" };
  }
}

export type CustomAddResult =
  | { ok: true; recordId: number }
  | { ok: false; error: string };

export async function customMaintenanceAddAction(
  vehicleId: number,
  customerId: number,
  workName: string,
  price: number
): Promise<CustomAddResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const vehicleAccess = await assertVehicleAccess(vehicleId);
  if (!vehicleAccess.ok) return vehicleAccess;

  if (!workName.trim()) {
    return { ok: false, error: "作業内容を入力してください" };
  }
  if (price < 0 || !Number.isInteger(price)) {
    return { ok: false, error: "金額は0以上の整数で入力してください" };
  }

  const staffId = authResult.userId;
  const today = todayJst();

  try {
    const [inserted] = await db
      .insert(maintenanceRecords)
      .values({
        vehicleId,
        workItemId: null,
        workName: workName.trim(),
        price,
        performedAt: today,
        staffId,
      })
      .returning({ id: maintenanceRecords.id });

    revalidatePath(`/customers/${customerId}/vehicles/${vehicleId}/maintenance`);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/customers`);
    revalidatePath(`/`);

    return { ok: true, recordId: inserted.id };
  } catch (error) {
    console.error("[customMaintenanceAddAction] DB insert failed:", error);
    return { ok: false, error: "記録に失敗しました。もう一度お試しください。" };
  }
}

export type DeleteMaintenanceResult =
  | { ok: true }
  | { ok: false; error: string };

// クイック追加直後の誤登録の取り消し（記録した本人 or オーナー・15分以内のみ）
const UNDO_WINDOW_MS = 15 * 60 * 1000;

export async function undoMaintenanceAddAction(
  recordId: number,
  customerId: number,
  vehicleId: number
): Promise<DeleteMaintenanceResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const vehicleAccess = await assertVehicleAccess(vehicleId);
  if (!vehicleAccess.ok) return vehicleAccess;

  const [record] = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, recordId))
    .limit(1);

  if (!record || record.vehicleId !== vehicleId) {
    return { ok: false, error: "記録が見つかりません" };
  }
  if (authResult.role !== "owner" && record.staffId !== authResult.userId) {
    return { ok: false, error: "自分が記録したものだけ取り消せます" };
  }
  if (Date.now() - record.createdAt.getTime() > UNDO_WINDOW_MS) {
    return { ok: false, error: "取り消せるのは記録から15分以内です（オーナーは整備履歴から削除できます）" };
  }

  try {
    await db.transaction(async (tx) => {
      // 自動消費した部品在庫を戻し、入出庫履歴ごと取り消す
      const movements = await tx
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.maintenanceRecordId, recordId));
      for (const m of movements) {
        await tx
          .update(parts)
          .set({ currentStock: sql`${parts.currentStock} - ${m.quantity}` })
          .where(eq(parts.id, m.partId));
      }
      await tx.delete(stockMovements).where(eq(stockMovements.maintenanceRecordId, recordId));
      await tx.delete(maintenanceRecords).where(eq(maintenanceRecords.id, recordId));
    });

    revalidatePath(`/customers/${customerId}/vehicles/${vehicleId}/maintenance`);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/customers`);
    revalidatePath(`/settings/parts`);
    revalidatePath(`/`);

    return { ok: true };
  } catch (error) {
    console.error("[undoMaintenanceAddAction] DB delete failed:", error);
    return { ok: false, error: "取り消しに失敗しました。もう一度お試しください。" };
  }
}

export async function deleteMaintenanceRecordAction(
  recordId: number,
  customerId: number,
  vehicleId: number
): Promise<DeleteMaintenanceResult> {
  const ownerResult = await requireOwner();
  if (!ownerResult.ok) return ownerResult;

  // 該当 vehicleId のアクセス確認（IDOR ガード）
  const vehicleAccess = await assertVehicleAccess(vehicleId);
  if (!vehicleAccess.ok) return vehicleAccess;

  // recordId が指定 vehicleId に属することを確認（IDOR ガード）
  const recordAccess = await assertMaintenanceRecordAccess(recordId);
  if (!recordAccess.ok) return recordAccess;
  if (recordAccess.vehicleId !== vehicleId) {
    return { ok: false, error: "整備記録が見つかりません" };
  }

  try {
    // stockMovements は ON DELETE SET NULL のため履歴は残る
    await db
      .delete(maintenanceRecords)
      .where(eq(maintenanceRecords.id, recordId));

    revalidatePath(`/customers/${customerId}/vehicles/${vehicleId}/maintenance`);
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);

    return { ok: true };
  } catch (error) {
    console.error("[deleteMaintenanceRecordAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}
