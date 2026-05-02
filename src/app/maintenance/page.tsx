"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type MaintenanceEntry = {
  id: number;
  customer_name: string;
  customer_id: number;
  bike_id: number;
  vehicle_type: string;
  maker: string;
  registration_no: string;
  maintenance_type: string;
  date: string;
  mileage: number;
  next_due_date: string;
  cost: number;
  description: string;
};

const TYPE_COLORS: { [key: string]: string } = {
  "オイル交換": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "バッテリー交換": "bg-blue-100 text-blue-800 border-blue-200",
  "タイヤ交換": "bg-green-100 text-green-800 border-green-200",
  "定期点検": "bg-purple-100 text-purple-800 border-purple-200",
};

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = (type: string) => {
    setLoading(true);
    const q = type !== "all" ? `?type=${encodeURIComponent(type)}` : "";
    fetch(`/api/maintenance${q}`)
      .then((r) => r.json())
      .then((data) => { setRecords(data); setLoading(false); });
  };

  useEffect(() => { load("all"); }, []);

  const handleFilter = (type: string) => {
    setFilter(type);
    load(type);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この整備記録を削除しますか？")) return;
    await fetch(`/api/maintenance/${id}`, { method: "DELETE" });
    load(filter);
  };

  const filters = ["all", "オイル交換", "バッテリー交換", "タイヤ交換", "定期点検", "その他"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">整備記録</h1>
        <Link href="/maintenance/new" className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 font-medium">
          + 記録追加
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f} onClick={() => handleFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-gray-800 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}>
            {f === "all" ? "すべて" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔧</div>
          <div>整備記録がありません</div>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${TYPE_COLORS[r.maintenance_type] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {r.maintenance_type}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{r.date}</span>
                    {r.mileage && <span className="text-sm text-gray-400">{r.mileage.toLocaleString()}km</span>}
                  </div>
                  <div className="text-sm">
                    <Link href={`/customers/${r.customer_id}`} className="text-orange-500 hover:underline font-medium">
                      {r.customer_name}
                    </Link>
                    <span className="text-gray-400 mx-2">|</span>
                    <Link href={`/bikes/${r.bike_id}`} className="text-blue-500 hover:underline">
                      {r.maker} {r.vehicle_type}
                      {r.registration_no && ` [${r.registration_no}]`}
                    </Link>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                  {r.next_due_date && (
                    <p className="text-xs text-gray-400 mt-1">次回予定: {r.next_due_date}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  {r.cost > 0 && <span className="text-sm font-bold">¥{r.cost.toLocaleString()}</span>}
                  <button onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-400 hover:text-red-600">削除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
