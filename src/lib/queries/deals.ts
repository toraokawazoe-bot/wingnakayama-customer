import { db, deals, dealPayments } from "@/db";
import { desc, eq, inArray } from "drizzle-orm";

export type DealPayment = {
  id: number;
  dealId: number;
  paidAt: string;
  amount: number;
  method: "cash" | "cashless" | "loan" | "other" | null;
  memo: string | null;
};

export type DealWithPayments = {
  id: number;
  customerId: number;
  status: "negotiating" | "contracted" | "delivered" | "cancelled";
  dealDate: string;
  maker: string | null;
  modelName: string | null;
  modelCode: string | null;
  color: string | null;
  frameNumber: string | null;
  productCode: string | null;
  vehiclePrice: number | null;
  accessoriesPrice: number | null;
  insurancePrice: number | null;
  registrationFee: number | null;
  discount: number | null;
  tradeInPrice: number | null;
  totalPrice: number | null;
  expectedDeliveryDate: string | null;
  memo: string | null;
  payments: DealPayment[];
  paidTotal: number;
  /** totalPrice が未入力なら null */
  remaining: number | null;
};

// 顧客の商談一覧（入金履歴つき）。2クエリで N+1 を回避。
export async function getDealsByCustomerId(
  customerId: number
): Promise<DealWithPayments[]> {
  const dealRows = await db
    .select()
    .from(deals)
    .where(eq(deals.customerId, customerId))
    .orderBy(desc(deals.dealDate), desc(deals.id));

  if (dealRows.length === 0) return [];

  const paymentRows = await db
    .select()
    .from(dealPayments)
    .where(inArray(dealPayments.dealId, dealRows.map((d) => d.id)))
    .orderBy(dealPayments.paidAt, dealPayments.id);

  const paymentsByDeal = new Map<number, DealPayment[]>();
  for (const p of paymentRows) {
    const list = paymentsByDeal.get(p.dealId) ?? [];
    list.push({
      id: p.id,
      dealId: p.dealId,
      paidAt: p.paidAt,
      amount: p.amount,
      method: p.method,
      memo: p.memo,
    });
    paymentsByDeal.set(p.dealId, list);
  }

  return dealRows.map((d) => {
    const payments = paymentsByDeal.get(d.id) ?? [];
    const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      id: d.id,
      customerId: d.customerId,
      status: d.status,
      dealDate: d.dealDate,
      maker: d.maker,
      modelName: d.modelName,
      modelCode: d.modelCode,
      color: d.color,
      frameNumber: d.frameNumber,
      productCode: d.productCode,
      vehiclePrice: d.vehiclePrice,
      accessoriesPrice: d.accessoriesPrice,
      insurancePrice: d.insurancePrice,
      registrationFee: d.registrationFee,
      discount: d.discount,
      tradeInPrice: d.tradeInPrice,
      totalPrice: d.totalPrice,
      expectedDeliveryDate: d.expectedDeliveryDate,
      memo: d.memo,
      payments,
      paidTotal,
      remaining: d.totalPrice != null ? d.totalPrice - paidTotal : null,
    };
  });
}
