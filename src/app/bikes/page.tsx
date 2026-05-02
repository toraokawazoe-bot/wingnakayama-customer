"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  year: number;
};

export default function BikesPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bikes")
      .then((r) => r.json())
      .then((data) => { setBikes(data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">車両管理</h1>
        <Link href="/bikes/new" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium">
          + 車両登録
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : bikes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🏍️</div>
          <div>車両が登録されていません</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="text-left px-4 py-3">メーカー・車種</th>
                <th className="text-left px-4 py-3">商品名・タイプ</th>
                <th className="text-left px-4 py-3">色</th>
                <th className="text-left px-4 py-3">登録ナンバー</th>
                <th className="text-left px-4 py-3">年式</th>
                <th className="text-left px-4 py-3">オーナー</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bikes.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.maker}</div>
                    <div className="text-sm text-gray-500">{b.vehicle_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.product_name || "—"}</div>
                    <div className="text-sm text-gray-500">{b.bike_type || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.color || "—"}</td>
                  <td className="px-4 py-3">
                    {b.registration_no ? (
                      <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">
                        {b.registration_no}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.year ? `${b.year}年` : "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${b.customer_id}`} className="text-blue-500 hover:underline text-sm">
                      {b.customer_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/bikes/${b.id}`} className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
