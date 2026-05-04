"use server";

import { db, customers, ownerships, vehicles } from "@/db";
import { customerFormSchema, type CustomerFormData } from "@/lib/schemas/customer";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";

export type UpdateCustomerResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateCustomerAction(
  customerId: number,
  data: CustomerFormData
): Promise<UpdateCustomerResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const parsed = customerFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;
  const normalizedPostalCode = v.postalCode
    ? v.postalCode.replace(/^(\d{3})-?(\d{4})$/, "$1-$2")
    : null;

  try {
    await db
      .update(customers)
      .set({
        lastName: v.lastName,
        firstName: v.firstName,
        lastNameKana: v.lastNameKana || null,
        firstNameKana: v.firstNameKana || null,
        postalCode: normalizedPostalCode,
        prefecture: v.prefecture || null,
        city: v.city || null,
        addressLine: v.addressLine || null,
        phone: v.phone || null,
        email: v.email || null,
        birthday: v.birthday || null,
        memo: v.memo || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    revalidatePath(`/customers/${customerId}`);
    return { ok: true };
  } catch (error) {
    console.error("[updateCustomerAction] DB update failed:", error);
    return { ok: false, error: "更新に失敗しました。もう一度お試しください。" };
  }
}

export type DeleteCustomerResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteCustomerAction(
  customerId: number
): Promise<DeleteCustomerResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") {
    return { ok: false, error: "オーナーのみ削除できます" };
  }

  try {
    // この顧客に紐づく全車両IDを取得
    const ownershipRows = await db
      .select({ vehicleId: ownerships.vehicleId })
      .from(ownerships)
      .where(eq(ownerships.customerId, customerId));

    const vehicleIds = ownershipRows.map((o) => o.vehicleId);

    await db.transaction(async (tx) => {
      // 車両を削除（→ ownerships + maintenance_records が cascade 削除）
      if (vehicleIds.length > 0) {
        await tx.delete(vehicles).where(inArray(vehicles.id, vehicleIds));
      }
      // 残存する所有権レコードを削除（念のため）
      await tx.delete(ownerships).where(eq(ownerships.customerId, customerId));
      // 顧客を削除
      await tx.delete(customers).where(eq(customers.id, customerId));
    });

    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[deleteCustomerAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}
