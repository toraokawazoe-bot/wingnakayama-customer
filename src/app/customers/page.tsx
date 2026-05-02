"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  name_kana: string;
  phone: string;
  email: string;
  birthday: string;
  bike_count: number;
  created_at: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (q: string) => {
    setLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setCustomers(data); setLoading(false); });
  };

  useEffect(() => { load(""); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">顧客管理</h1>
        <Link href="/customers/new" className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium">
          + 新規登録
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="お客様名・カナ・電話番号で検索"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button type="submit" className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
          検索
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); load(""); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            クリア
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <div>顧客が登録されていません</div>
          <Link href="/customers/new" className="text-orange-500 underline mt-2 inline-block">新規登録する</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="text-left px-4 py-3">お客様名</th>
                <th className="text-left px-4 py-3">カナ</th>
                <th className="text-left px-4 py-3">電話番号</th>
                <th className="text-left px-4 py-3">メール</th>
                <th className="text-center px-4 py-3">車両数</th>
                <th className="text-left px-4 py-3">登録日</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.name_kana || "—"}</td>
                  <td className="px-4 py-3">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                      {c.bike_count}台
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c.id}`} className="text-orange-500 hover:text-orange-700 text-sm font-medium">
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
