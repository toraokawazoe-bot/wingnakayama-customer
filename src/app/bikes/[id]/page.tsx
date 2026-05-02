"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MaintenanceRecord = {
  id: number;
  maintenance_type: string;
  date: string;
  mileage: number;
  next_due_date: string;
  cost: number;
  description: string;
  notes: string;
};

type Bike = {
  id: number;
  customer_id: number;
  customer_name: string;
  vehicle_type: string;
  maker: string;
  product_name: string;
  bike_type: string;
  color: string;
  registration_no: string;
  frame_no: string;
  displacement: number;
  year: number;
  purchase_date: string;
  notes: string;
  maintenance: MaintenanceRecord[];
};

const TYPE_COLORS: Record<string, string> = {
  "オイル交換": "bg-yellow-100 text-yellow-800",
  "バッテリー交換": "bg-blue-100 text-blue-800",
  "タイヤ交換": "bg-green-100 text-green-800",
  "定期点検": "bg-purple-100 text-purple-800",
};

export default function BikeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bike, setBike] = useState<Bike | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bikes/${id}`)
      .then((r) => r.json())
      .then((data) => { setBike(data); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("この車両を削除しますか？")) return;
    await fetch(`/api/bikes/${id}`, { method: "DELETE" });
    router.push("/bikes");
  };

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  if (!bike) return <div className="text-center py-20 text-red-400">車両が見つかりません</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bikes" className="text-gray-500 hover:text-gray-700">← 車両一覧</Link>
          <h1 className="text-2xl font-bold text-gray-800">
            {bike.maker} {bike.vehicle_type}
          </h1>
          {bike.registration_no && (
            <span className="bg-gray-800 text-white text-sm font-bold px-2 py-1 rounded">
              {bike.registration_no}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/bikes/${id}/edit`} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            編集
          </Link>
          <button onClick={handleDelete} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">
            削除
          </button>
        </div>
      </div>

      {/* 車両情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-bold text-gray-700 mb-4 border-b pb-2">車両情報</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div><dt className="text-gray-500">メーカー</dt><dd className="font-medium mt-1">{bike.maker || "—"}</dd></div>
          <div><dt className="text-gray-500">車種名</dt><dd className="font-medium mt-1">{bike.vehicle_type || "—"}</dd></div>
          <div><dt className="text-gray-500">商品名</dt><dd className="font-medium mt-1">{bike.product_name || "—"}</dd></div>
          <div><dt className="text-gray-500">タイプ</dt><dd className="font-medium mt-1">{bike.bike_type || "—"}</dd></div>
          <div><dt className="text-gray-500">色</dt><dd className="font-medium mt-1">{bike.color || "—"}</dd></div>
          <div><dt className="text-gray-500">排気量</dt><dd className="font-medium mt-1">{bike.displacement ? `${bike.displacement}cc` : "—"}</dd></div>
          <div><dt className="text-gray-500">年式</dt><dd className="font-medium mt-1">{bike.year ? `${bike.year}年` : "—"}</dd></div>
          <div><dt className="text-gray-500">登録ナンバー</dt><dd className="font-medium mt-1">{bike.registration_no || "—"}</dd></div>
          <div><dt className="text-gray-500">車台番号</dt><dd className="font-medium mt-1">{bike.frame_no || "—"}</dd></div>
          <div><dt className="text-gray-500">購入日</dt><dd className="font-medium mt-1">{bike.purchase_date || "—"}</dd></div>
          <div><dt className="text-gray-500">オーナー</dt>
            <dd className="font-medium mt-1">
              <Link href={`/customers/${bike.customer_id}`} className="text-orange-500 hover:underline">
                {bike.customer_name}
              </Link>
            </dd>
          </div>
          {bike.notes && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-gray-500">メモ</dt>
              <dd className="font-medium mt-1 whitespace-pre-wrap">{bike.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* 整備記録 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="font-bold text-gray-700">整備記録 ({bike.maintenance.length}件)</h2>
          <Link href={`/maintenance/new?bike_id=${id}&customer_id=${bike.customer_id}`}
            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
            + 記録追加
          </Link>
        </div>
        {bike.maintenance.length === 0 ? (
          <p className="text-gray-400 text-sm">整備記録がありません</p>
        ) : (
          <div className="space-y-3">
            {bike.maintenance.map((m) => (
              <div key={m.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full mr-2 ${TYPE_COLORS[m.maintenance_type] || "bg-gray-100 text-gray-700"}`}>
                      {m.maintenance_type}
                    </span>
                    <span className="text-sm text-gray-500">{m.date}</span>
                    {m.mileage && <span className="ml-2 text-sm text-gray-400">{m.mileage.toLocaleString()}km</span>}
                  </div>
                  <div className="text-right">
                    {m.cost > 0 && <div className="text-sm font-medium">¥{m.cost.toLocaleString()}</div>}
                    {m.next_due_date && (
                      <div className="text-xs text-gray-400 mt-1">次回予定: {m.next_due_date}</div>
                    )}
                  </div>
                </div>
                {m.description && <p className="text-sm text-gray-600 mt-2">{m.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
