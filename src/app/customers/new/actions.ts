"use server";

import { db, customers } from "@/db";
import {
  customerFormSchema,
  customerLightFormSchema,
  type CustomerFormData,
  type CustomerLightFormData,
} from "@/lib/schemas/customer";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type CreateCustomerResult =
  | { ok: true; customerId: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createCustomerAction(
  data: CustomerFormData
): Promise<CreateCustomerResult> {
  // 認証チェック
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  // バリデーション
  const parsed = customerFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const validated = parsed.data;

  // 郵便番号のハイフンを正規化（123-4567形式に統一）
  const normalizedPostalCode = validated.postalCode
    ? validated.postalCode.replace(/^(\d{3})-?(\d{4})$/, "$1-$2")
    : null;

  try {
    const [inserted] = await db
      .insert(customers)
      .values({
        lastName: validated.lastName,
        firstName: validated.firstName,
        lastNameKana: validated.lastNameKana || null,
        firstNameKana: validated.firstNameKana || null,
        postalCode: normalizedPostalCode,
        prefecture: validated.prefecture || null,
        city: validated.city || null,
        addressLine: validated.addressLine || null,
        phone: validated.phone || null,
        email: validated.email || null,
        birthday: validated.birthday || null,
        memo: validated.memo || null,
      })
      .returning({ id: customers.id });

    return { ok: true, customerId: inserted.id };
  } catch (error) {
    console.error("[createCustomerAction] DB insert failed:", error);
    return { ok: false, error: "登録に失敗しました。もう一度お試しください。" };
  }
}

export async function createCustomerLightAction(
  data: CustomerLightFormData
): Promise<CreateCustomerResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const parsed = customerLightFormSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const v = parsed.data;

  try {
    const [inserted] = await db
      .insert(customers)
      .values({
        lastName: v.lastName,
        firstName: v.firstName,
        phone: v.phone || null,
        memo: v.memo || null,
      })
      .returning({ id: customers.id });

    return { ok: true, customerId: inserted.id };
  } catch (error) {
    console.error("[createCustomerLightAction] DB insert failed:", error);
    return { ok: false, error: "登録に失敗しました。もう一度お試しください。" };
  }
}
