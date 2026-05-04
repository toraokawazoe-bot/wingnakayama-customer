"use server";

import { db, vehicles, ownerships } from "@/db";
import { vehicleFormSchema, type VehicleFormData } from "@/lib/schemas/vehicle";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export type UpdateVehicleResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateVehicleAction(
  customerId: number,
  vehicleId: number,
  data: VehicleFormData
): Promise<UpdateVehicleResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const parsed = vehicleFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;

  try {
    await db
      .update(vehicles)
      .set({
        maker: v.maker,
        modelName: v.modelName,
        modelCode: v.modelCode || null,
        displacement: v.displacement as number,
        plateNumber: v.plateNumber,
        frameNumber: v.frameNumber || null,
        firstRegistrationDate: v.firstRegistrationDate || null,
        engineModel: v.engineModel || null,
        color: v.color || null,
        purchaseMileage: v.purchaseMileage ? Number(v.purchaseMileage) : null,
        purchaseSource: (v.purchaseSource as "own_sale" | "other_shop" | "used_purchase" | "unknown") || null,
        memo: v.memo || null,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (error) {
    console.error("[updateVehicleAction] DB update failed:", error);
    return { ok: false, error: "更新に失敗しました。もう一度お試しください。" };
  }
}

export type DeleteVehicleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteVehicleAction(
  customerId: number,
  vehicleId: number
): Promise<DeleteVehicleResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") {
    return { ok: false, error: "オーナーのみ削除できます" };
  }

  // この顧客が所有している車両か確認
  const ownership = await db
    .select({ id: ownerships.id })
    .from(ownerships)
    .where(and(eq(ownerships.customerId, customerId), eq(ownerships.vehicleId, vehicleId)))
    .limit(1);

  if (ownership.length === 0) {
    return { ok: false, error: "この車両は指定した顧客に紐づいていません" };
  }

  try {
    // 車両削除で ownerships + maintenance_records が cascade 削除
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));

    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (error) {
    console.error("[deleteVehicleAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}
