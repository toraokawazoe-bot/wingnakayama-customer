"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createDealAction,
  updateDealAction,
  deleteDealAction,
  addDealPaymentAction,
  deleteDealPaymentAction,
  type DealFormData,
} from "@/app/customers/[id]/deals/actions";
import type { DealWithPayments } from "@/lib/queries/deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";

const STATUS_LABEL: Record<DealWithPayments["status"], string> = {
  negotiating: "検討中",
  contracted: "成約",
  delivered: "納車済",
  cancelled: "キャンセル",
};

const STATUS_STYLE: Record<DealWithPayments["status"], string> = {
  negotiating: "bg-blue-100 text-blue-700",
  contracted: "bg-green-100 text-green-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-600",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  cashless: "キャッシュレス",
  loan: "クレジット・ローン",
  other: "その他",
};

type Props = {
  customerId: number;
  deals: DealWithPayments[];
  isOwner: boolean;
  today: string; // JST YYYY-MM-DD（サーバから渡す）
};

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

function parseYen(s: string): number | null | undefined {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  if (isNaN(n) || n < 0) return undefined; // 不正値
  return n;
}

export function DealsPanel({ customerId, deals, isOwner, today }: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithPayments | null>(null);

  return (
    <section className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">購入記録</h2>
        {!isFormOpen && !editingDeal && (
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            購入を追加
          </Button>
        )}
      </div>

      {isFormOpen && (
        <DealForm
          customerId={customerId}
          today={today}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {editingDeal && (
        <DealForm
          customerId={customerId}
          today={today}
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
        />
      )}

      {deals.length === 0 && !isFormOpen ? (
        <p className="text-sm text-gray-400 text-center py-6">購入記録はまだありません</p>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              customerId={customerId}
              isOwner={isOwner}
              today={today}
              onEdit={() => {
                setIsFormOpen(false);
                setEditingDeal(deal);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DealCard({
  deal,
  customerId,
  isOwner,
  today,
  onEdit,
}: {
  deal: DealWithPayments;
  customerId: number;
  isOwner: boolean;
  today: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const vehicleLabel =
    [deal.maker, deal.modelName].filter(Boolean).join(" ") || "車種未入力";

  const breakdown: { label: string; value: number | null; minus?: boolean }[] = [
    { label: "車両本体価格", value: deal.vehiclePrice },
    { label: "付属品", value: deal.accessoriesPrice },
    { label: "自賠責保険", value: deal.insurancePrice },
    { label: "登録・諸費用", value: deal.registrationFee },
    { label: "値引き", value: deal.discount, minus: true },
    { label: "下取車価格", value: deal.tradeInPrice, minus: true },
  ];
  const hasBreakdown = breakdown.some((b) => b.value != null);

  function handleDelete() {
    if (!confirm(`「${vehicleLabel}」の購入記録を削除しますか？\n入金記録も一緒に削除されます。`)) return;
    startTransition(async () => {
      const result = await deleteDealAction(deal.id, customerId);
      if (result.ok) {
        toast.success("購入記録を削除しました");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border rounded-lg p-4">
      {/* ヘッダー：ステータス + 車種 + 操作 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLE[deal.status]}`}>
              {STATUS_LABEL[deal.status]}
            </span>
            <span className="text-base font-bold">{vehicleLabel}</span>
            {deal.color && <span className="text-sm text-gray-500">{deal.color}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            購入日: {deal.dealDate}
            {deal.expectedDeliveryDate && <span className="ml-2">納期予定: {deal.expectedDeliveryDate}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-9 text-sm text-gray-500" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            編集
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm text-red-500 hover:text-red-600"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              削除
            </Button>
          )}
        </div>
      </div>

      {/* 車両詳細 */}
      {(deal.modelCode || deal.frameNumber || deal.productCode) && (
        <div className="mt-2 text-xs text-gray-500 space-x-3 font-mono">
          {deal.modelCode && <span>型式: {deal.modelCode}</span>}
          {deal.frameNumber && <span>フレームNo: {deal.frameNumber}</span>}
          {deal.productCode && <span>商品コード: {deal.productCode}</span>}
        </div>
      )}

      {/* 金額サマリ（合計・入金済・残金を一目で） */}
      <div className="mt-3 pt-3 border-t">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg px-1 py-2 text-center">
            <div className="text-[10px] text-gray-500">合計金額</div>
            <div className="font-bold text-sm sm:text-base">
              {deal.totalPrice != null ? yen(deal.totalPrice) : "—"}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg px-1 py-2 text-center">
            <div className="text-[10px] text-green-700">入金済</div>
            <div className="font-bold text-sm sm:text-base text-green-700">
              {yen(deal.paidTotal)}
            </div>
          </div>
          <div className={`rounded-lg px-1 py-2 text-center ${
            deal.remaining != null && deal.remaining > 0 ? "bg-red-50" : "bg-gray-50"
          }`}>
            <div className={`text-[10px] ${
              deal.remaining != null && deal.remaining > 0 ? "text-red-600" : "text-gray-500"
            }`}>残金</div>
            <div className={`font-bold text-sm sm:text-base ${
              deal.remaining != null && deal.remaining > 0 ? "text-red-600" : "text-gray-600"
            }`}>
              {deal.remaining != null ? yen(deal.remaining) : "—"}
            </div>
          </div>
        </div>
        {hasBreakdown && (
          <>
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 mt-2"
              onClick={() => setShowBreakdown((v) => !v)}
            >
              内訳
              {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showBreakdown && (
              <dl className="mt-1 space-y-0.5 text-xs text-gray-500">
                {breakdown
                  .filter((b) => b.value != null)
                  .map((b) => (
                    <div key={b.label} className="flex justify-between">
                      <dt>{b.label}</dt>
                      <dd className="font-mono">
                        {b.minus ? `-${yen(b.value!)}` : yen(b.value!)}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </>
        )}
      </div>

      {/* 入金履歴 */}
      <div className="mt-3 pt-3 border-t">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">入金履歴</h4>

        {deal.payments.length > 0 && (
          <ul className="space-y-1 mb-2">
            {deal.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  <span className="font-mono text-xs text-gray-400 mr-2">{p.paidAt}</span>
                  <span className="font-medium">{yen(p.amount)}</span>
                  {p.method && (
                    <span className="ml-2 text-xs text-gray-400">{METHOD_LABEL[p.method]}</span>
                  )}
                  {p.memo && <span className="ml-2 text-xs text-gray-400">{p.memo}</span>}
                </div>
                {isOwner && (
                  <PaymentDeleteButton paymentId={p.id} customerId={customerId} />
                )}
              </li>
            ))}
          </ul>
        )}

        <PaymentAddForm dealId={deal.id} customerId={customerId} today={today} remaining={deal.remaining} />
      </div>

      {deal.memo && (
        <div className="mt-3 pt-3 border-t text-sm text-gray-600 whitespace-pre-wrap">{deal.memo}</div>
      )}
    </div>
  );
}

function PaymentDeleteButton({ paymentId, customerId }: { paymentId: number; customerId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("この入金記録を削除しますか？")) return;
    startTransition(async () => {
      const result = await deleteDealPaymentAction(paymentId, customerId);
      if (result.ok) {
        toast.success("入金記録を削除しました");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      className="text-gray-300 hover:text-red-500 shrink-0 ml-2 p-2 -m-1 rounded hover:bg-red-50"
      disabled={isPending}
      onClick={handleDelete}
      aria-label="入金記録を削除"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

function PaymentAddForm({
  dealId,
  customerId,
  today,
  remaining,
}: {
  dealId: number;
  customerId: number;
  today: string;
  remaining: number | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [paidAt, setPaidAt] = useState(today);
  const [amount, setAmount] = useState("");
  // 店頭はほぼ現金なのでデフォルト現金（選び直しの手間を減らす）
  const [method, setMethod] = useState("cash");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const n = parseInt(amount, 10);
    if (isNaN(n) || n <= 0) {
      toast.error("金額は1円以上で入力してください");
      return;
    }
    startTransition(async () => {
      const result = await addDealPaymentAction(dealId, customerId, {
        paidAt,
        amount: n,
        method: (method || null) as "cash" | "cashless" | "loan" | "other" | null,
      });
      if (result.ok) {
        toast.success(`入金 ${yen(n)} を記録しました`);
        setAmount("");
        setMethod("cash");
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-sm h-9"
        onClick={() => {
          setPaidAt(today);
          setIsOpen(true);
        }}
      >
        <Plus className="w-4 h-4 mr-1" />
        入金を追加
      </Button>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <Input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="w-40 h-10 text-base"
          disabled={isPending}
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">¥</span>
          <Input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金額"
            className="w-36 h-10 pl-7 text-base"
            disabled={isPending}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            autoFocus
          />
        </div>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="h-10 text-base border rounded-md px-2 bg-white text-gray-700"
          disabled={isPending}
        >
          <option value="cash">現金</option>
          <option value="cashless">キャッシュレス</option>
          <option value="loan">クレジット・ローン</option>
          <option value="other">その他</option>
          <option value="">（未指定）</option>
        </select>
      </div>
      {remaining != null && remaining > 0 && amount !== remaining.toString() && (
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setAmount(remaining.toString())}
          disabled={isPending}
        >
          残額 {yen(remaining)} を入力
        </button>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="h-9" disabled={isPending} onClick={handleAdd}>
          記録する
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-gray-500"
          disabled={isPending}
          onClick={() => setIsOpen(false)}
        >
          キャンセル
        </Button>
      </div>
    </div>
  );
}

const YEN_FIELDS = [
  { key: "vehiclePrice", label: "車両本体価格" },
  { key: "accessoriesPrice", label: "付属品" },
  { key: "insurancePrice", label: "自賠責保険" },
  { key: "registrationFee", label: "登録・諸費用" },
  { key: "discount", label: "値引き（−）" },
  { key: "tradeInPrice", label: "下取車価格（−）" },
] as const;

type YenKey = (typeof YEN_FIELDS)[number]["key"];

function DealForm({
  customerId,
  today,
  deal,
  onClose,
}: {
  customerId: number;
  today: string;
  deal?: DealWithPayments;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dealDate, setDealDate] = useState(deal?.dealDate ?? today);
  const [status, setStatus] = useState<DealWithPayments["status"]>(deal?.status ?? "negotiating");
  const [maker, setMaker] = useState(deal?.maker ?? "");
  const [modelName, setModelName] = useState(deal?.modelName ?? "");
  const [modelCode, setModelCode] = useState(deal?.modelCode ?? "");
  const [color, setColor] = useState(deal?.color ?? "");
  const [frameNumber, setFrameNumber] = useState(deal?.frameNumber ?? "");
  const [productCode, setProductCode] = useState(deal?.productCode ?? "");
  const [yenValues, setYenValues] = useState<Record<YenKey, string>>({
    vehiclePrice: deal?.vehiclePrice?.toString() ?? "",
    accessoriesPrice: deal?.accessoriesPrice?.toString() ?? "",
    insurancePrice: deal?.insurancePrice?.toString() ?? "",
    registrationFee: deal?.registrationFee?.toString() ?? "",
    discount: deal?.discount?.toString() ?? "",
    tradeInPrice: deal?.tradeInPrice?.toString() ?? "",
  });
  const [totalPrice, setTotalPrice] = useState(deal?.totalPrice?.toString() ?? "");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(deal?.expectedDeliveryDate ?? "");
  const [memo, setMemo] = useState(deal?.memo ?? "");

  // 内訳からの自動計算（値引き・下取は減算）
  const computedTotal = (() => {
    const v = (k: YenKey) => {
      const n = parseInt(yenValues[k], 10);
      return isNaN(n) ? 0 : n;
    };
    const hasAny = YEN_FIELDS.some((f) => yenValues[f.key].trim() !== "");
    if (!hasAny) return null;
    return (
      v("vehiclePrice") + v("accessoriesPrice") + v("insurancePrice") + v("registrationFee")
      - v("discount") - v("tradeInPrice")
    );
  })();

  function handleSubmit() {
    const parsedYen: Partial<Record<YenKey | "totalPrice", number | null>> = {};
    for (const f of YEN_FIELDS) {
      const v = parseYen(yenValues[f.key]);
      if (v === undefined) {
        toast.error(`${f.label}は0以上の整数で入力してください`);
        return;
      }
      parsedYen[f.key] = v;
    }
    const total = parseYen(totalPrice);
    if (total === undefined) {
      toast.error("合計金額は0以上の整数で入力してください");
      return;
    }

    const data: DealFormData = {
      dealDate,
      status,
      maker: maker.trim(),
      modelName: modelName.trim(),
      modelCode: modelCode.trim(),
      color: color.trim(),
      frameNumber: frameNumber.trim(),
      productCode: productCode.trim(),
      vehiclePrice: parsedYen.vehiclePrice,
      accessoriesPrice: parsedYen.accessoriesPrice,
      insurancePrice: parsedYen.insurancePrice,
      registrationFee: parsedYen.registrationFee,
      discount: parsedYen.discount,
      tradeInPrice: parsedYen.tradeInPrice,
      totalPrice: total,
      expectedDeliveryDate: expectedDeliveryDate || "",
      memo: memo.trim(),
    };

    startTransition(async () => {
      const result = deal
        ? await updateDealAction(deal.id, customerId, data)
        : await createDealAction(customerId, data);
      if (result.ok) {
        toast.success(deal ? "購入記録を更新しました" : "購入記録を登録しました");
        onClose();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{deal ? "購入記録を編集" : "新しい購入記録"}</h3>
        <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="閉じる">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">購入日</label>
          <Input
            type="date"
            value={dealDate}
            onChange={(e) => setDealDate(e.target.value)}
            className="w-36 h-8 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ステータス</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DealWithPayments["status"])}
            className="h-8 text-sm border rounded-md px-2 bg-white text-gray-700"
            disabled={isPending}
          >
            <option value="negotiating">検討中</option>
            <option value="contracted">成約</option>
            <option value="delivered">納車済</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">納期予定</label>
          <Input
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            className="w-36 h-8 text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ご希望車種</h4>
        <div className="grid grid-cols-2 gap-2">
          <Input value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="メーカー" className="h-8 text-sm" disabled={isPending} />
          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="車名" className="h-8 text-sm" disabled={isPending} />
          <Input value={modelCode} onChange={(e) => setModelCode(e.target.value)} placeholder="型式" className="h-8 text-sm" disabled={isPending} />
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="色" className="h-8 text-sm" disabled={isPending} />
          <Input value={frameNumber} onChange={(e) => setFrameNumber(e.target.value)} placeholder="フレームNo." className="h-8 text-sm font-mono" disabled={isPending} />
          <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="商品コード" className="h-8 text-sm font-mono" disabled={isPending} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">金額</h4>
        <div className="grid grid-cols-2 gap-2">
          {YEN_FIELDS.map((f) => (
            <div key={f.key} className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">¥</span>
              <Input
                type="number"
                min="0"
                value={yenValues[f.key]}
                onChange={(e) => setYenValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.label}
                title={f.label}
                className="h-8 text-sm pl-6"
                disabled={isPending}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">¥</span>
            <Input
              type="number"
              min="0"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              placeholder="合計金額"
              className="h-8 text-sm pl-6 font-semibold"
              disabled={isPending}
            />
          </div>
          {computedTotal != null && computedTotal.toString() !== totalPrice && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline shrink-0"
              onClick={() => setTotalPrice(Math.max(0, computedTotal).toString())}
              disabled={isPending}
            >
              内訳合計 {yen(Math.max(0, computedTotal))} を反映
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">メモ</label>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="text-sm"
          placeholder="購入に関するメモ・お客様のご要望など"
          disabled={isPending}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={handleSubmit}>
          {deal ? "更新する" : "登録する"}
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-500" disabled={isPending} onClick={onClose}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
