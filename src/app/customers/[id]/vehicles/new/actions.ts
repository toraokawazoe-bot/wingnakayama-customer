"use server";

import { db, vehicles, ownerships } from "@/db";
import { vehicleFormSchema, type VehicleFormData } from "@/lib/schemas/vehicle";
import { getCustomerById } from "@/lib/queries/customers";
import { auth } from "@/auth";

export type CreateVehicleResult =
  | { ok: true; vehicleId: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createVehicleAction(
  customerId: number,
  data: VehicleFormData
): Promise<CreateVehicleResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    return { ok: false, error: "顧客が見つかりません" };
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
  const today = new Date().toISOString().slice(0, 10);

  try {
    const vehicleId = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(vehicles)
        .values({
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
        })
        .returning({ id: vehicles.id });

      await tx.insert(ownerships).values({
        vehicleId: inserted.id,
        customerId,
        startDate: today,
        ownershipType: "new_purchase",
      });

      return inserted.id;
    });

    return { ok: true, vehicleId };
  } catch (error) {
    console.error("[createVehicleAction] DB insert failed:", error);
    return { ok: false, error: "登録に失敗しました。もう一度お試しください。" };
  }
}
