"use server";

import { db, maintenanceRecords, workItemParts, parts, stockMovements } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const batchItemSchema = z.object({
  vehicleId: z.number().int().positive(),
  workItemId: z.number().int().positive().nullable(),
  workName: z.string().min(1, "作業内容は必須です").max(200),
  price: z.number().int().min(0),
  mileage: z.number().int().min(0).nullable(),
  memo: z.string().max(1000).nullable(),
  performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です"),
});

const batchInputSchema = z.array(batchItemSchema).min(1, "1件以上入力してください");

export type BatchAddResult =
  | { ok: true; insertedCount: number }
  | { ok: false; error: string; failedAtIndex?: number };

export async function batchAddMaintenanceAction(
  items: unknown[]
): Promise<BatchAddResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const staffId = session.user.id ?? null;

  const parsed = batchInputSchema.safeParse(items);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const idx = typeof issue.path[0] === "number" ? issue.path[0] : undefined;
    return { ok: false, error: issue.message ?? "入力エラー", failedAtIndex: idx };
  }

  const validItems = parsed.data;

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];

        const [inserted] = await tx
          .insert(maintenanceRecords)
          .values({
            vehicleId: item.vehicleId,
            workItemId: item.workItemId,
            workName: item.workName,
            price: item.price,
            mileage: item.mileage,
            performedAt: item.performedAt,
            staffId,
            memo: item.memo,
          })
          .returning({ id: maintenanceRecords.id });

        // 作業マスタ紐付き部品の在庫消費
        if (item.workItemId) {
          const linkedParts = await tx
            .select({ partId: workItemParts.partId, quantity: workItemParts.quantity })
            .from(workItemParts)
            .where(eq(workItemParts.workItemId, item.workItemId));

          for (const lp of linkedParts) {
            // current_stock は SQL で引き算（同トランザクション内）
            const current = await tx
              .select({ currentStock: parts.currentStock })
              .from(parts)
              .where(eq(parts.id, lp.partId))
              .limit(1);

            if (current.length > 0) {
              await tx
                .update(parts)
                .set({ currentStock: current[0].currentStock - lp.quantity })
                .where(eq(parts.id, lp.partId));
              await tx.insert(stockMovements).values({
                partId: lp.partId,
                movementType: "out",
                quantity: -lp.quantity,
                maintenanceRecordId: inserted.id,
                memo: `自動消費: ${item.workName}`,
              });
            }
          }
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/customers");
    revalidatePath("/settings/parts");

    return { ok: true, insertedCount: validItems.length };
  } catch (error) {
    console.error("[batchAddMaintenanceAction]", error);
    return { ok: false, error: "保存に失敗しました。もう一度お試しください。" };
  }
}
