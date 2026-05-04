"use server";

import { db, parts, stockMovements } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { partFormSchema } from "@/lib/schemas/part";

type Result = { ok: true } | { ok: false; error: string };

function ownerOnly(role: string | undefined): Result | null {
  if (role !== "owner") return { ok: false, error: "オーナーのみ操作できます" };
  return null;
}

export async function createPartAction(formData: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };
  const err = ownerOnly((session.user as { role?: string }).role);
  if (err) return err;

  const parsed = partFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力エラー" };
  }

  const d = parsed.data;
  try {
    await db.insert(parts).values({
      name: d.name,
      category: d.category || null,
      sku: d.sku || null,
      supplier: d.supplier || null,
      purchasePrice: typeof d.purchasePrice === "number" ? d.purchasePrice : null,
      sellingPrice: typeof d.sellingPrice === "number" ? d.sellingPrice : null,
      currentStock: d.currentStock,
      minStock: d.minStock,
      unit: d.unit,
      isActive: d.isActive,
      memo: d.memo || null,
    });
    revalidatePath("/settings/parts");
    return { ok: true };
  } catch (error) {
    console.error("[createPartAction]", error);
    return { ok: false, error: "登録に失敗しました" };
  }
}

export async function updatePartAction(id: number, formData: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };
  const err = ownerOnly((session.user as { role?: string }).role);
  if (err) return err;

  const parsed = partFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力エラー" };
  }

  const d = parsed.data;
  try {
    await db.update(parts).set({
      name: d.name,
      category: d.category || null,
      sku: d.sku || null,
      supplier: d.supplier || null,
      purchasePrice: typeof d.purchasePrice === "number" ? d.purchasePrice : null,
      sellingPrice: typeof d.sellingPrice === "number" ? d.sellingPrice : null,
      currentStock: d.currentStock,
      minStock: d.minStock,
      unit: d.unit,
      isActive: d.isActive,
      memo: d.memo || null,
    }).where(eq(parts.id, id));
    revalidatePath("/settings/parts");
    return { ok: true };
  } catch (error) {
    console.error("[updatePartAction]", error);
    return { ok: false, error: "更新に失敗しました" };
  }
}

export async function togglePartActiveAction(id: number, isActive: boolean): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };
  const err = ownerOnly((session.user as { role?: string }).role);
  if (err) return err;

  try {
    await db.update(parts).set({ isActive }).where(eq(parts.id, id));
    revalidatePath("/settings/parts");
    return { ok: true };
  } catch (error) {
    console.error("[togglePartActiveAction]", error);
    return { ok: false, error: "更新に失敗しました" };
  }
}

export async function adjustStockAction(
  partId: number,
  newStock: number,
  memo: string
): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  if (!Number.isInteger(newStock) || newStock < 0) {
    return { ok: false, error: "在庫数は0以上の整数で入力してください" };
  }

  try {
    const current = await db.select({ currentStock: parts.currentStock })
      .from(parts).where(eq(parts.id, partId)).limit(1);
    if (current.length === 0) return { ok: false, error: "部品が見つかりません" };

    const diff = newStock - current[0].currentStock;

    await db.update(parts).set({ currentStock: newStock }).where(eq(parts.id, partId));
    await db.insert(stockMovements).values({
      partId,
      movementType: "adjust",
      quantity: diff,
      memo: memo || null,
    });

    revalidatePath("/settings/parts");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    console.error("[adjustStockAction]", error);
    return { ok: false, error: "在庫調整に失敗しました" };
  }
}
