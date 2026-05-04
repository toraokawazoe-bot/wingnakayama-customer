"use server";

import { db, workItems } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { workItemFormSchema } from "@/lib/schemas/work-item";

type Result = { ok: true } | { ok: false; error: string };

export async function createWorkItemAction(formData: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return { ok: false, error: "オーナーのみ操作できます" };

  const parsed = workItemFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力エラー" };
  }

  const { name, category, defaultPrice, displayOrder, isActive } = parsed.data;

  try {
    await db.insert(workItems).values({
      name,
      category: category || null,
      defaultPrice,
      displayOrder,
      isActive,
    });
    revalidatePath("/settings/work-items");
    return { ok: true };
  } catch (error) {
    console.error("[createWorkItemAction]", error);
    return { ok: false, error: "登録に失敗しました" };
  }
}

export async function updateWorkItemAction(id: number, formData: unknown): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return { ok: false, error: "オーナーのみ操作できます" };

  const parsed = workItemFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力エラー" };
  }

  const { name, category, defaultPrice, displayOrder, isActive } = parsed.data;

  try {
    await db
      .update(workItems)
      .set({ name, category: category || null, defaultPrice, displayOrder, isActive })
      .where(eq(workItems.id, id));
    revalidatePath("/settings/work-items");
    return { ok: true };
  } catch (error) {
    console.error("[updateWorkItemAction]", error);
    return { ok: false, error: "更新に失敗しました" };
  }
}

export async function toggleWorkItemActiveAction(id: number, isActive: boolean): Promise<Result> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return { ok: false, error: "オーナーのみ操作できます" };

  try {
    await db.update(workItems).set({ isActive }).where(eq(workItems.id, id));
    revalidatePath("/settings/work-items");
    return { ok: true };
  } catch (error) {
    console.error("[toggleWorkItemActiveAction]", error);
    return { ok: false, error: "更新に失敗しました" };
  }
}
