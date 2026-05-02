"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Customer = { id: number; name: string };
type Bike = { id: number; customer_id: number; vehicle_type: string; maker: string; registration_no: string };
type Item = { description: string; quantity: number; unit_price: number; amount: number };

const COMMON_ITEMS = [
  { description: "オイル交換工賃", unit_price: 2000 },
  { description: "エンジンオイル (1L)", unit_price: 800 },
  { description: "オイルフィルター", unit_price: 1500 },
  { description: "バッテリー交換工賃", unit_price: 3000 },
  { description: "タイヤ交換工賃 (前)", unit_price: 5000 },
  { description: "タイヤ交換工賃 (後)", unit_price: 6000 },
  { description: "定期点検工賃 (12ヶ月)", unit_price: 8000 },
  { description: "定期点検工賃 (24ヶ月)", unit_price: 15000 },
];

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get("customer_id") || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [filteredBikes, setFilteredBikes] = useState<Bike[]>([]);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [bikeId, setBikeId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  const [taxRate] = useState(0.10);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
    fetch("/api/bikes").then((r) => r.json()).then((data) => {
      setBikes(data);
      if (defaultCustomerId) {
        setFilteredBikes(data.filter((b: Bike) => String(b.customer_id) === defaultCustomerId));
      } else {
        setFilteredBikes(data);
      }
    });
  }, [defaultCustomerId]);

  const handleCustomerChange = (val: string) => {
    setCustomerId(val);
    setBikeId("");
    setFilteredBikes(bikes.filter((b) => String(b.customer_id) === val));
  };

  const updateItem = (i: number, field: keyof Item, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[i], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.amount = Number(item.quantity) * Number(item.unit_price);
      }
      updated[i] = item;
      return updated;
    });
  };

  const addItem = () => setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0, amount: 0 }]);
  const addCommonItem = (template: { description: string; unit_price: number }) => {
    setItems((p) => [...p, { description: template.description, quantity: 1, unit_price: template.unit_price, amount: template.unit_price }]);
  };
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = Math.floor(subtotal * taxRate);
  const total = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { setError("お客様を選択してください"); return; }
    if (items.every((i) => !i.description)) { setError("明細を1つ以上入力してください"); return; }
    setSaving(true);
    setError("");

    const validItems = items.filter((i) => i.description);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId, bike_id: bikeId || null, issue_date: issueDate, due_date: dueDate || null, items: validItems, tax_rate: taxRate, notes }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.id}`);
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-gray-500 hover:text-gray-700">← 請求書一覧</Link>
        <h1 className="text-2xl font-bold text-gray-800">請求書作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-gray-700 border-b pb-2">基本情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お客様 <span className="text-red-500">*</span></label>
              <select value={customerId} onChange={(e) => handleCustomerChange(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">選択してください</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">車両</label>
              <select value={bikeId} onChange={(e) => setBikeId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="">選択してください</option>
                {filteredBikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.maker} {b.vehicle_type}{b.registration_no ? ` [${b.registration_no}]` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発行日</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">支払期限</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-gray-700 border-b pb-2">よく使う品目</h2>
          <div className="flex flex-wrap gap-2">
            {COMMON_ITEMS.map((t) => (
              <button key={t.description} type="button" onClick={() => addCommonItem(t)}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-green-100 hover:text-green-700 border border-gray-200">
                + {t.description}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-gray-700 border-b pb-2">明細</h2>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <div className="col-span-5">品目・内容</div>
              <div className="col-span-2 text-right">数量</div>
              <div className="col-span-3 text-right">単価</div>
              <div className="col-span-2 text-right">金額</div>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="品目名"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                </div>
                <div className="col-span-2">
                  <input value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} type="number" min="0" step="0.1"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-400" />
                </div>
                <div className="col-span-3">
                  <input value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} type="number" min="0"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-400" />
                </div>
                <div className="col-span-1 text-right text-sm font-medium">¥{item.amount.toLocaleString()}</div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem}
              className="text-sm text-green-600 hover:text-green-800 mt-2">+ 行追加</button>
          </div>

          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-end gap-8">
              <span className="text-gray-500">小計</span>
              <span className="w-24 text-right">¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-8">
              <span className="text-gray-500">消費税 (10%)</span>
              <span className="w-24 text-right">¥{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-8 font-bold text-base border-t pt-1">
              <span>合計</span>
              <span className="w-24 text-right">¥{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium">
            {saving ? "作成中..." : "請求書を作成"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">読み込み中...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
