"use server";

import { z } from "zod";
import { db, customers } from "@/db";
import { auth } from "@/auth";

const customerImportRowSchema = z.object({
  lastName: z.string().min(1, "姓は必須です").max(50),
  firstName: z.string().min(1, "名は必須です").max(50),
  lastNameKana: z.string().max(50).optional().or(z.literal("")),
  firstNameKana: z.string().max(50).optional().or(z.literal("")),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/)
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  prefecture: z.string().max(10).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[\d-]*$/)
    .max(20)
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  email: z.email().max(200).optional().or(z.literal("")).or(z.undefined()),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(""))
    .or(z.undefined()),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

export type CustomerImportRecord = z.infer<typeof customerImportRowSchema>;

export type ImportResult =
  | { ok: true; insertedCount: number; skippedCount: number }
  | { ok: false; error: string; failedAtIndex?: number };

export async function importCustomersAction(
  records: CustomerImportRecord[]
): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") {
    return { ok: false, error: "オーナーのみデータを取り込めます" };
  }

  if (!Array.isArray(records) || records.length === 0) {
    return { ok: false, error: "取り込むデータがありません" };
  }

  let skippedCount = 0;
  const validRows: typeof customers.$inferInsert[] = [];

  for (let i = 0; i < records.length; i++) {
    const parsed = customerImportRowSchema.safeParse(records[i]);
    if (!parsed.success) {
      skippedCount++;
      continue;
    }
    const v = parsed.data;
    const normalizedPostalCode = v.postalCode
      ? v.postalCode.replace(/^(\d{3})-?(\d{4})$/, "$1-$2")
      : null;

    validRows.push({
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
    });
  }

  if (validRows.length === 0) {
    return { ok: false, error: "有効なデータが1件もありませんでした" };
  }

  try {
    await db.transaction(async (tx) => {
      for (const row of validRows) {
        await tx.insert(customers).values(row);
      }
    });
    return { ok: true, insertedCount: validRows.length, skippedCount };
  } catch (error) {
    console.error("[importCustomersAction] DB insert failed:", error);
    return { ok: false, error: "データベースへの挿入に失敗しました" };
  }
}
