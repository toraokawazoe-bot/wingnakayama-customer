"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: number; name: string };

type BikeData = {
  customer_id: string;
  vehicle_type: string;
  maker: string;
  product_name: string;
  bike_type: string;
  color: string;
  registration_no: string;
  frame_no: string;
  displacement: string;
  year: string;
  purchase_date: string;
  notes: string;
};

type Props = {
  initial?: Partial<BikeData>;
  bikeId?: number;
  defaultCustomerId?: string;
};

const MAKERS = ["Honda", "Yamaha", "Suzuki", "Kawasaki", "BMW", "Ducati", "Harley-Davidson", "KTM", "その他"];
const TYPES = ["ネイキッド", "スポーツ", "アメリカン", "オフロード", "スクーター", "ツアラー", "クルーザー", "モタード", "その他"];

export default function BikeForm({ initial, bikeId, defaultCustomerId }: Props) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<BikeData>({
    customer_id: initial?.customer_id || defaultCustomerId || "",
    vehicle_type: initial?.vehicle_type || "",
    maker: initial?.maker || "",
    product_name: initial?.product_name || "",
    bike_type: initial?.bike_type || "",
    color: initial?.color || "",
    registration_no: initial?.registration_no || "",
    frame_no: initial?.frame_no || "",
    displacement: initial?.displacement || "",
    year: initial?.year || "",
    purchase_date: initial?.purchase_date || "",
    notes: initial?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then(setCustomers);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) { setError("お客様を選択してください"); return; }
    setSaving(true);
    setError("");

    const url = bikeId ? `/api/bikes/${bikeId}` : "/api/bikes";
    const method = bikeId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/bikes/${data.id}`);
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">お客様 <span className="text-red-500">*</span></label>
        <select name="customer_id" value={form.customer_id} onChange={handleChange} required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">選択してください</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メーカー</label>
          <select name="maker" value={form.maker} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">選択してください</option>
            {MAKERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">車種名</label>
          <input name="vehicle_type" value={form.vehicle_type} onChange={handleChange}
            placeholder="例: CB400SF"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">商品名</label>
        <input name="product_name" value={form.product_name} onChange={handleChange}
          placeholder="例: CB400 Super Four"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
          <select name="bike_type" value={form.bike_type} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">選択してください</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">色</label>
          <input name="color" value={form.color} onChange={handleChange}
            placeholder="例: 赤"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">登録ナンバー</label>
          <input name="registration_no" value={form.registration_no} onChange={handleChange}
            placeholder="例: 品川 123 あ 4567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">車台番号 (FrNo)</label>
          <input name="frame_no" value={form.frame_no} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">排気量 (cc)</label>
          <input name="displacement" value={form.displacement} onChange={handleChange} type="number"
            placeholder="例: 400"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">年式</label>
          <input name="year" value={form.year} onChange={handleChange} type="number"
            placeholder="例: 2020"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">購入日</label>
        <input name="purchase_date" value={form.purchase_date} onChange={handleChange} type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">
          キャンセル
        </button>
      </div>
    </form>
  );
}
