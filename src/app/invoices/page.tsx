"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Invoice = {
  id: number;
  invoice_no: string;
  customer_name: string;
  customer_id: number;
  vehicle_type: string;
  registration_no: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setInvoices([]); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この請求書を削除しますか？")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  const unpaidTotal = invoices.filter((i) => i.status === "未払い").reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">請求書</h1>
        <Link href="/invoices/new" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium">
          + 請求書作成
        </Link>
      </div>

      {invoices.some((i) => i.status === "未払い") && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <span className="text-amber-700 font-medium">未払い合計: </span>
          <span className="text-amber-800 font-bold text-lg">¥{unpaidTotal.toLocaleString()}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📄</div>
          <div>請求書がありません</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="text-left px-4 py-3">請求書番号</th>
                <th className="text-left px-4 py-3">お客様</th>
                <th className="text-left px-4 py-3">車両</th>
                <th className="text-left px-4 py-3">発行日</th>
                <th className="text-right px-4 py-3">合計金額</th>
                <th className="text-center px-4 py-3">状態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{inv.invoice_no}</td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${inv.customer_id}`} className="text-orange-500 hover:underline">
                      {inv.customer_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {inv.vehicle_type || "—"}
                    {inv.registration_no && <span className="ml-1 text-xs">[{inv.registration_no}]</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{inv.issue_date}</td>
                  <td className="px-4 py-3 text-right font-bold">¥{inv.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleStatusChange(inv.id, inv.status === "未払い" ? "支払済み" : "未払い")}
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        inv.status === "支払済み"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {inv.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link href={`/invoices/${inv.id}`} className="text-green-500 hover:text-green-700 text-sm font-medium">
                      詳細
                    </Link>
                    <button onClick={() => handleDelete(inv.id)} className="text-red-400 hover:text-red-600 text-sm">
                      削除
                    </button>
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
