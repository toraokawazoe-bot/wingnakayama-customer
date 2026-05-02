"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Bike = {
  id: number;
  vehicle_type: string;
  maker: string;
  product_name: string;
  bike_type: string;
  color: string;
  registration_no: string;
  frame_no: string;
  year: number;
};

type Customer = {
  id: number;
  name: string;
  name_kana: string;
  phone: string;
  birthday: string;
  email: string;
  notes: string;
  created_at: string;
  bikes: Bike[];
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((data) => { setCustomer(data); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("この顧客を削除しますか？関連する車両・整備記録も削除されます。")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    router.push("/customers");
  };

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  if (!customer) return <div className="text-center py-20 text-red-400">顧客が見つかりません</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="text-gray-500 hover:text-gray-700">← 顧客一覧</Link>
          <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
          {customer.name_kana && <span className="text-gray-400 text-sm">({customer.name_kana})</span>}
        </div>
        <div className="flex gap-2">
          <Link href={`/customers/${id}/edit`} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            編集
          </Link>
          <button onClick={handleDelete} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">
            削除
          </button>
        </div>
      </div>

      {/* 顧客情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-bold text-gray-700 mb-4 border-b pb-2">顧客情報</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-500">電話番号</dt><dd className="font-medium mt-1">{customer.phone || "—"}</dd></div>
          <div><dt className="text-gray-500">メール</dt><dd className="font-medium mt-1">{customer.email || "—"}</dd></div>
          <div><dt className="text-gray-500">生年月日</dt><dd className="font-medium mt-1">{customer.birthday || "—"}</dd></div>
          <div><dt className="text-gray-500">登録日</dt><dd className="font-medium mt-1">{customer.created_at?.slice(0, 10)}</dd></div>
          {customer.notes && (
            <div className="col-span-2"><dt className="text-gray-500">メモ</dt><dd className="font-medium mt-1 whitespace-pre-wrap">{customer.notes}</dd></div>
          )}
        </dl>
      </div>

      {/* 保有車両 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="font-bold text-gray-700">保有車両 ({customer.bikes.length}台)</h2>
          <Link href={`/bikes/new?customer_id=${id}`} className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
            + 車両追加
          </Link>
        </div>
        {customer.bikes.length === 0 ? (
          <p className="text-gray-400 text-sm">車両が登録されていません</p>
        ) : (
          <div className="space-y-3">
            {customer.bikes.map((bike) => (
              <Link key={bike.id} href={`/bikes/${bike.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{bike.maker} {bike.vehicle_type} {bike.product_name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {bike.bike_type && <span className="mr-3">{bike.bike_type}</span>}
                      {bike.color && <span className="mr-3">色: {bike.color}</span>}
                      {bike.year && <span className="mr-3">{bike.year}年式</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {bike.registration_no && (
                      <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">
                        {bike.registration_no}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="flex gap-3">
        <Link href={`/maintenance/new?customer_id=${id}`} className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600">
          🔧 整備記録を追加
        </Link>
        <Link href={`/invoices/new?customer_id=${id}`} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
          📄 請求書を作成
        </Link>
      </div>
    </div>
  );
}
