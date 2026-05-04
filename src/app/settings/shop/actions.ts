"use server";

import { db, shopSettings } from "@/db";
import { shopSettingsSchema, type ShopSettingsFormData } from "@/lib/schemas/shop";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export type UpdateShopResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateShopSettingsAction(
  data: ShopSettingsFormData
): Promise<UpdateShopResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") {
    return { ok: false, error: "オーナーのみ設定を変更できます" };
  }

  const parsed = shopSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;

  try {
    const existing = await db.select({ id: shopSettings.id }).from(shopSettings).limit(1);

    if (existing.length === 0) {
      await db.insert(shopSettings).values({
        shopName: v.shopName,
        ownerName: v.ownerName || null,
        postalCode: v.postalCode || null,
        address: v.address || null,
        phone: v.phone || null,
        email: v.email || null,
        registrationNumber: v.registrationNumber || null,
      });
    } else {
      await db
        .update(shopSettings)
        .set({
          shopName: v.shopName,
          ownerName: v.ownerName || null,
          postalCode: v.postalCode || null,
          address: v.address || null,
          phone: v.phone || null,
          email: v.email || null,
          registrationNumber: v.registrationNumber || null,
          updatedAt: new Date(),
        })
        .where(eq(shopSettings.id, existing[0].id));
    }

    revalidatePath("/settings/shop");
    return { ok: true };
  } catch (error) {
    console.error("[updateShopSettingsAction] DB update failed:", error);
    return { ok: false, error: "保存に失敗しました。もう一度お試しください。" };
  }
}
