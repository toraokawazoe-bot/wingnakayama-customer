"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = {
  id: number;
  bike_id: number;
  customer_id: number;
  maintenance_type: string;
  last_date: string;
  next_due_date: string;
  customer_name: string;
  customer_phone: string;
  vehicle_type: string;
  maker: string;
  product_name: string;
  registration_no: string;
  days_overdue: number;
};

type AlertData = {
  overdue: Alert[];
  upcoming: Alert[];
  future: Alert[];
  total: number;
};

function AlertCard({ alert, color }: { alert: Alert; color: string }) {
  const daysText =
    alert.days_overdue > 0
      ? `${Math.floor(alert.days_overdue)}日超過`
      : `あと${Math.abs(Math.floor(alert.days_overdue))}日`;

  return (
    <div className={`border-l-4 ${color} bg-white rounded shadow-sm p-4 flex justify-between items-start`}>
      <div>
        <div className="font-semibold text-gray-800">{alert.customer_name}</div>
        <div className="text-sm text-gray-500">{alert.customer_phone}</div>
        <div className="text-sm mt-1">
          <span className="font-medium">{alert.maintenance_type}</span>
          {" — "}
          {alert.maker} {alert.vehicle_type}
          {alert.registration_no && <span className="ml-1 text-gray-400">[{alert.registration_no}]</span>}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          前回: {alert.last_date} → 次回予定: {alert.next_due_date}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 ml-4">
        <span className={`text-sm font-bold ${alert.days_overdue > 0 ? "text-red-600" : "text-orange-500"}`}>
          {daysText}
        </span>
        <Link
          href={`/customers/${alert.customer_id}`}
          className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
        >
          顧客詳細
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<AlertData | null>(null);
  const [stats, setStats] = useState({ customers: 0, bikes: 0, invoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/alerts").then((r) => r.json()).catch(() => null),
      fetch("/api/customers").then((r) => r.json()).catch(() => []),
      fetch("/api/bikes").then((r) => r.json()).catch(() => []),
      fetch("/api/invoices").then((r) => r.json()).catch(() => []),
    ]).then(([alerts, customers, bikes, invoices]) => {
      setData(alerts?.overdue !== undefined ? alerts : { overdue: [], upcoming: [], future: [], total: 0 });
      setStats({
        customers: Array.isArray(customers) ? customers.length : 0,
        bikes: Array.isArray(bikes) ? bikes.length : 0,
        invoices: Array.isArray(invoices) ? invoices.length : 0,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/customers" className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-orange-500">{stats.customers}</div>
          <div className="text-gray-500 mt-1">登録顧客数</div>
        </Link>
        <Link href="/bikes" className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-500">{stats.bikes}</div>
          <div className="text-gray-500 mt-1">登録車両数</div>
        </Link>
        <Link href="/invoices" className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-500">{stats.invoices}</div>
          <div className="text-gray-500 mt-1">請求書数</div>
        </Link>
      </div>

      {/* メンテナンスアラート */}
      {data && (
        <>
          {data.overdue.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-red-600 mb-3">
                ⚠️ 交換時期超過 ({data.overdue.length}件)
              </h2>
              <div className="space-y-3">
                {data.overdue.map((a) => (
                  <AlertCard key={`${a.id}-${a.maintenance_type}`} alert={a} color="border-red-500" />
                ))}
              </div>
            </section>
          )}

          {data.upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-orange-500 mb-3">
                🔔 まもなく交換時期 (30日以内) ({data.upcoming.length}件)
              </h2>
              <div className="space-y-3">
                {data.upcoming.map((a) => (
                  <AlertCard key={`${a.id}-${a.maintenance_type}`} alert={a} color="border-orange-400" />
                ))}
              </div>
            </section>
          )}

          {data.overdue.length === 0 && data.upcoming.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center text-green-700">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-medium">現在、交換時期が迫っているお客様はいません</div>
            </div>
          )}
        </>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link href="/customers/new" className="bg-white rounded-lg shadow p-4 text-center hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-200">
            <div className="text-2xl mb-1">👤</div>
            <div className="text-sm font-medium">新規顧客登録</div>
          </Link>
          <Link href="/bikes/new" className="bg-white rounded-lg shadow p-4 text-center hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200">
            <div className="text-2xl mb-1">🏍️</div>
            <div className="text-sm font-medium">車両登録</div>
          </Link>
          <Link href="/maintenance/new" className="bg-white rounded-lg shadow p-4 text-center hover:bg-yellow-50 transition-colors border border-transparent hover:border-yellow-200">
            <div className="text-2xl mb-1">🔧</div>
            <div className="text-sm font-medium">整備記録入力</div>
          </Link>
          <Link href="/invoices/new" className="bg-white rounded-lg shadow p-4 text-center hover:bg-green-50 transition-colors border border-transparent hover:border-green-200">
            <div className="text-2xl mb-1">📄</div>
            <div className="text-sm font-medium">請求書作成</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
