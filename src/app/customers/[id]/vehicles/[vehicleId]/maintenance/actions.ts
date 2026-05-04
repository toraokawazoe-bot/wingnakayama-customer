"use server";

import { db, maintenanceRecords, workItems, workItemParts, parts, stockMovements } from "@/db";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type QuickAddResult =
  | { ok: true; recordId: number }
  | { ok: false; error: string };

export async function quickAddMaintenanceAction(
  vehicleId: number,
  workItemId: number
): Promise<QuickAddResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const staffId = session.user.id ?? null;

  const item = await db
    .select()
    .from(workItems)
    .where(eq(workItems.id, workItemId))
    .limit(1);

  if (item.length === 0) {
    return { ok: false, error: "作業マスタが見つかりません" };
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const [inserted] = await db
      .insert(maintenanceRecords)
      .values({
        vehicleId,
        workItemId: item[0].id,
        workName: item[0].name,
        price: item[0].defaultPrice,
        performedAt: today,
        staffId: staffId ?? null,
      })
      .returning({ id: maintenanceRecords.id });

    // 使用部品の在庫を自動消費（在庫不足でも続行、警告のみ）
    const linkedParts = await db
      .select({ partId: workItemParts.partId, quantity: workItemParts.quantity })
      .from(workItemParts)
      .where(eq(workItemParts.workItemId, item[0].id));

    for (const lp of linkedParts) {
      await db
        .update(parts)
        .set({ currentStock: sql`${parts.currentStock} - ${lp.quantity}` })
        .where(eq(parts.id, lp.partId));
      await db.insert(stockMovements).values({
        partId: lp.partId,
        movementType: "out",
        quantity: -lp.quantity,
        maintenanceRecordId: inserted.id,
        memo: `自動消費: ${item[0].name}`,
      });
    }

    revalidatePath(`/customers`);
    revalidatePath(`/settings/parts`);
    revalidatePath(`/`);

    return { ok: true, recordId: inserted.id };
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
  workName: string,
  price: number
): Promise<CustomAddResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  if (!workName.trim()) {
    return { ok: false, error: "作業内容を入力してください" };
  }
  if (price < 0 || !Number.isInteger(price)) {
    return { ok: false, error: "金額は0以上の整数で入力してください" };
  }

  const staffId = session.user.id ?? null;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [inserted] = await db
      .insert(maintenanceRecords)
      .values({
        vehicleId,
        workItemId: null,
        workName: workName.trim(),
        price,
        performedAt: today,
        staffId: staffId ?? null,
      })
      .returning({ id: maintenanceRecords.id });

    revalidatePath(`/customers`);

    return { ok: true, recordId: inserted.id };
  } catch (error) {
    console.error("[customMaintenanceAddAction] DB insert failed:", error);
    return { ok: false, error: "記録に失敗しました。もう一度お試しください。" };
  }
}

export type DeleteMaintenanceResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteMaintenanceRecordAction(
  recordId: number,
  customerId: number,
  vehicleId: number
): Promise<DeleteMaintenanceResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") {
    return { ok: false, error: "オーナーのみ削除できます" };
  }

  try {
    await db
      .delete(maintenanceRecords)
      .where(eq(maintenanceRecords.id, recordId));

    revalidatePath(`/customers/${customerId}/vehicles/${vehicleId}/maintenance`);

    return { ok: true };
  } catch (error) {
    console.error("[deleteMaintenanceRecordAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}
