"use server";

import { db, maintenanceRecords } from "@/db";
import { maintenanceRecordSchema, type MaintenanceRecordFormData } from "@/lib/schemas/maintenance";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export type UpdateMaintenanceResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateMaintenanceRecordAction(
  recordId: number,
  data: MaintenanceRecordFormData
): Promise<UpdateMaintenanceResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const parsed = maintenanceRecordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;

  try {
    const existing = await db
      .select({ vehicleId: maintenanceRecords.vehicleId })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, recordId))
      .limit(1);

    if (existing.length === 0) {
      return { ok: false, error: "整備記録が見つかりません" };
    }

    await db
      .update(maintenanceRecords)
      .set({
        workName: v.workName,
        price: v.price,
        mileage: v.mileage ? Number(v.mileage) : null,
        performedAt: v.performedAt,
        memo: v.memo || null,
      })
      .where(eq(maintenanceRecords.id, recordId));

    revalidatePath(`/maintenance/${recordId}/edit`);
    return { ok: true };
  } catch (error) {
    console.error("[updateMaintenanceRecordAction] DB update failed:", error);
    return { ok: false, error: "更新に失敗しました。もう一度お試しください。" };
  }
}
