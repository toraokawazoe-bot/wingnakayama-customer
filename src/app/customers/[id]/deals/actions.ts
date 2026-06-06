"use server";

import { db, deals, dealPayments, customers } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireOwner } from "@/lib/auth-guards";
import { todayJst } from "@/lib/date";
import { revalidatePath } from "next/cache";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionalYen = z
  .number()
  .int("金額は整数で入力してください")
  .min(0, "金額は0以上で入力してください")
  .nullable()
  .optional();

const dealSchema = z.object({
  dealDate: z.string().regex(DATE_RE, "購入日の形式が不正です"),
  status: z.enum(["negotiating", "contracted", "delivered", "cancelled"]),
  maker: z.string().trim().max(50).optional(),
  modelName: z.string().trim().max(100).optional(),
  modelCode: z.string().trim().max(50).optional(),
  color: z.string().trim().max(50).optional(),
  frameNumber: z.string().trim().max(50).optional(),
  productCode: z.string().trim().max(50).optional(),
  vehiclePrice: optionalYen,
  accessoriesPrice: optionalYen,
  insurancePrice: optionalYen,
  registrationFee: optionalYen,
  discount: optionalYen,
  tradeInPrice: optionalYen,
  totalPrice: optionalYen,
  expectedDeliveryDate: z
    .string()
    .regex(DATE_RE, "納期予定日の形式が不正です")
    .optional()
    .or(z.literal("")),
  memo: z.string().trim().max(1000).optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;

export type DealActionResult =
  | { ok: true; dealId: number }
  | { ok: false; error: string };

// 商談が存在し、指定顧客のものであることを確認（IDOR ガード）
async function assertDealAccess(
  dealId: number,
  customerId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const found = await db
    .select({ id: deals.id, customerId: deals.customerId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);
  if (found.length === 0 || found[0].customerId !== customerId) {
    return { ok: false, error: "購入記録が見つかりません" };
  }
  return { ok: true };
}

function toDealValues(data: DealFormData) {
  return {
    dealDate: data.dealDate,
    status: data.status,
    maker: data.maker || null,
    modelName: data.modelName || null,
    modelCode: data.modelCode || null,
    color: data.color || null,
    frameNumber: data.frameNumber || null,
    productCode: data.productCode || null,
    vehiclePrice: data.vehiclePrice ?? null,
    accessoriesPrice: data.accessoriesPrice ?? null,
    insurancePrice: data.insurancePrice ?? null,
    registrationFee: data.registrationFee ?? null,
    discount: data.discount ?? null,
    tradeInPrice: data.tradeInPrice ?? null,
    totalPrice: data.totalPrice ?? null,
    expectedDeliveryDate: data.expectedDeliveryDate || null,
    memo: data.memo || null,
  };
}

export async function createDealAction(
  customerId: number,
  data: DealFormData
): Promise<DealActionResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const parsed = dealSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }

  const customer = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (customer.length === 0) {
    return { ok: false, error: "顧客が見つかりません" };
  }

  try {
    const [inserted] = await db
      .insert(deals)
      .values({
        customerId,
        staffId: authResult.userId,
        ...toDealValues(parsed.data),
      })
      .returning({ id: deals.id });

    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);
    return { ok: true, dealId: inserted.id };
  } catch (error) {
    console.error("[createDealAction] DB insert failed:", error);
    return { ok: false, error: "登録に失敗しました。もう一度お試しください。" };
  }
}

export async function updateDealAction(
  dealId: number,
  customerId: number,
  data: DealFormData
): Promise<DealActionResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const access = await assertDealAccess(dealId, customerId);
  if (!access.ok) return access;

  const parsed = dealSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }

  try {
    await db
      .update(deals)
      .set({ ...toDealValues(parsed.data), updatedAt: new Date() })
      .where(eq(deals.id, dealId));

    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);
    return { ok: true, dealId };
  } catch (error) {
    console.error("[updateDealAction] DB update failed:", error);
    return { ok: false, error: "更新に失敗しました。もう一度お試しください。" };
  }
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteDealAction(
  dealId: number,
  customerId: number
): Promise<DeleteResult> {
  const ownerResult = await requireOwner();
  if (!ownerResult.ok) return ownerResult;

  const access = await assertDealAccess(dealId, customerId);
  if (!access.ok) return access;

  try {
    // deal_payments は ON DELETE cascade
    await db.delete(deals).where(eq(deals.id, dealId));
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);
    return { ok: true };
  } catch (error) {
    console.error("[deleteDealAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}

const paymentSchema = z.object({
  paidAt: z.string().regex(DATE_RE, "入金日の形式が不正です"),
  amount: z
    .number()
    .int("金額は整数で入力してください")
    .min(1, "金額は1円以上で入力してください"),
  method: z.enum(["cash", "cashless", "loan", "other"]).nullable().optional(),
  memo: z.string().trim().max(200).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

export type PaymentActionResult =
  | { ok: true; paymentId: number }
  | { ok: false; error: string };

export async function addDealPaymentAction(
  dealId: number,
  customerId: number,
  data: PaymentFormData
): Promise<PaymentActionResult> {
  const authResult = await requireAuth();
  if (!authResult.ok) return authResult;

  const access = await assertDealAccess(dealId, customerId);
  if (!access.ok) return access;

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }

  try {
    const [inserted] = await db
      .insert(dealPayments)
      .values({
        dealId,
        paidAt: parsed.data.paidAt || todayJst(),
        amount: parsed.data.amount,
        method: parsed.data.method ?? null,
        memo: parsed.data.memo || null,
      })
      .returning({ id: dealPayments.id });

    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);
    return { ok: true, paymentId: inserted.id };
  } catch (error) {
    console.error("[addDealPaymentAction] DB insert failed:", error);
    return { ok: false, error: "入金の記録に失敗しました。もう一度お試しください。" };
  }
}

export async function deleteDealPaymentAction(
  paymentId: number,
  customerId: number
): Promise<DeleteResult> {
  const ownerResult = await requireOwner();
  if (!ownerResult.ok) return ownerResult;

  // 入金 → 商談 → 顧客の整合を確認（IDOR ガード）
  const found = await db
    .select({ id: dealPayments.id, dealId: dealPayments.dealId })
    .from(dealPayments)
    .where(eq(dealPayments.id, paymentId))
    .limit(1);
  if (found.length === 0) {
    return { ok: false, error: "入金記録が見つかりません" };
  }
  const access = await assertDealAccess(found[0].dealId, customerId);
  if (!access.ok) return access;

  try {
    await db.delete(dealPayments).where(eq(dealPayments.id, paymentId));
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/`);
    return { ok: true };
  } catch (error) {
    console.error("[deleteDealPaymentAction] DB delete failed:", error);
    return { ok: false, error: "削除に失敗しました。もう一度お試しください。" };
  }
}
