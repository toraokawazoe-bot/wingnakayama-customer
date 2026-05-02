"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Customer = { id: number; name: string };
type Bike = { id: number; customer_id: number; vehicle_type: string; maker: string; product_name: string; registration_no: string };

const MAINTENANCE_TYPES = ["オイル交換", "バッテリー交換", "タイヤ交換", "定期点検 (12ヶ月)", "定期点検 (24ヶ月)", "ブレーキ整備", "チェーン調整", "エンジンオーバーホール", "その他"];

// デフォルト次回予定日（月数を加算）
const DEFAULT_INTERVALS: Record<string, number> = {
  "オイル交換": 6,
  "バッテリー交換": 24,
  "タイヤ交換": 12,
  "定期点検 (12ヶ月)": 12,
  "定期点検 (24ヶ月)": 24,
};

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function NewMaintenanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get("customer_id") || "";
  const defaultBikeId = searchParams.get("bike_id") || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [filteredBikes, setFilteredBikes] = useState<Bike[]>([]);
  const [form, setForm] = useState({
    customer_id: defaultCustomerId,
    bike_id: defaultBikeId,
    maintenance_type: "オイル交換",
    date: new Date().toISOString().split("T")[0],
    mileage: "",
    next_due_date: addMonths(new Date().toISOString().split("T")[0], 6),
    next_due_mileage: "",
    cost: "",
    description: "",
    notes: "",
  });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => {
      const updated = { ...f, [name]: value };

      if (name === "customer_id") {
        updated.bike_id = "";
        setFilteredBikes(bikes.filter((b) => String(b.customer_id) === value));
      }

      if (name === "maintenance_type" && DEFAULT_INTERVALS[value]) {
        updated.next_due_date = addMonths(f.date, DEFAULT_INTERVALS[value]);
      }

      if (name === "date" && DEFAULT_INTERVALS[f.maintenance_type]) {
        updated.next_due_date = addMonths(value, DEFAULT_INTERVALS[f.maintenance_type]);
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bike_id || !form.customer_id) { setError("お客様と車両を選択してください"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        next_due_mileage: form.next_due_mileage ? parseInt(form.next_due_mileage) : null,
        cost: form.cost ? parseFloat(form.cost) : 0,
      }),
    });

    if (res.ok) {
      router.push(defaultBikeId ? `/bikes/${defaultBikeId}` : "/maintenance");
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
        <Link href="/maintenance" className="text-gray-500 hover:text-gray-700">← 整備記録</Link>
        <h1 className="text-2xl font-bold text-gray-800">整備記録追加</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">お客様 <span className="text-red-500">*</span></label>
          <select name="customer_id" value={form.customer_id} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">選択してください</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">車両 <span className="text-red-500">*</span></label>
          <select name="bike_id" value={form.bike_id} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">選択してください</option>
            {filteredBikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.maker} {b.vehicle_type} {b.product_name && `(${b.product_name})`}
                {b.registration_no && ` [${b.registration_no}]`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">整備種別 <span className="text-red-500">*</span></label>
          <select name="maintenance_type" value={form.maintenance_type} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">実施日 <span className="text-red-500">*</span></label>
            <input name="date" value={form.date} onChange={handleChange} type="date" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">走行距離 (km)</label>
            <input name="mileage" value={form.mileage} onChange={handleChange} type="number"
              placeholder="例: 15000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">次回予定日</label>
            <input name="next_due_date" value={form.next_due_date} onChange={handleChange} type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <p className="text-xs text-gray-400 mt-1">自動計算されます（変更可）</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">次回予定走行距離 (km)</label>
            <input name="next_due_mileage" value={form.next_due_mileage} onChange={handleChange} type="number"
              placeholder="例: 21000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">費用 (円)</label>
          <input name="cost" value={form.cost} onChange={handleChange} type="number"
            placeholder="例: 5000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">作業内容</label>
          <input name="description" value={form.description} onChange={handleChange}
            placeholder="例: 4L交換、フィルター交換"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium">
            {saving ? "保存中..." : "保存"}
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

export default function NewMaintenancePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">読み込み中...</div>}>
      <NewMaintenanceContent />
    </Suspense>
  );
}
