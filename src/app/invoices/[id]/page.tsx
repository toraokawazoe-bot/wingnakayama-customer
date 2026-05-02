"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = { id: number; description: string; quantity: number; unit_price: number; amount: number };
type Invoice = {
  id: number;
  invoice_no: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  bike_id: number;
  vehicle_type: string;
  maker: string;
  registration_no: string;
  color: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string;
  items: Item[];
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => { setInvoice(data); setLoading(false); });
  }, [id]);

  const handleStatusChange = async () => {
    if (!invoice) return;
    const newStatus = invoice.status === "未払い" ? "支払済み" : "未払い";
    await fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setInvoice((prev) => prev ? { ...prev, status: newStatus } : null);
  };

  const handleDelete = async () => {
    if (!confirm("この請求書を削除しますか？")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;
  if (!invoice) return <div className="text-center py-20 text-red-400">請求書が見つかりません</div>;

  return (
    <>
      {/* 画面操作バー（印刷時非表示） */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/invoices" className="text-gray-500 hover:text-gray-700">← 請求書一覧</Link>
            <h1 className="text-2xl font-bold text-gray-800">{invoice.invoice_no}</h1>
            <span className={`text-sm font-bold px-2 py-1 rounded-full ${invoice.status === "支払済み" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {invoice.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
              🖨️ 印刷・PDF
            </button>
            <button onClick={handleStatusChange}
              className={`px-4 py-2 rounded-lg font-medium ${invoice.status === "未払い" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              {invoice.status === "未払い" ? "支払済みにする" : "未払いに戻す"}
            </button>
            <button onClick={handleDelete} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">
              削除
            </button>
          </div>
        </div>
      </div>

      {/* 請求書本体 */}
      <div id="invoice-body" className="bg-white shadow-lg rounded-lg p-8 mt-4 max-w-3xl mx-auto print:shadow-none print:rounded-none print:p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">請 求 書</h2>
        </div>

        <div className="flex justify-between mb-8">
          <div>
            <div className="text-lg font-bold text-gray-800 border-b-2 border-gray-800 pb-1 mb-2">
              {invoice.customer_name} 様
            </div>
            {invoice.customer_phone && <div className="text-sm text-gray-500">TEL: {invoice.customer_phone}</div>}
            {invoice.vehicle_type && (
              <div className="text-sm text-gray-500 mt-1">
                車両: {invoice.maker} {invoice.vehicle_type}
                {invoice.registration_no && ` [${invoice.registration_no}]`}
              </div>
            )}
          </div>
          <div className="text-right text-sm space-y-1">
            <div><span className="text-gray-500">請求書番号: </span><span className="font-mono font-bold">{invoice.invoice_no}</span></div>
            <div><span className="text-gray-500">発行日: </span>{invoice.issue_date}</div>
            {invoice.due_date && <div><span className="text-gray-500">支払期限: </span>{invoice.due_date}</div>}
          </div>
        </div>

        {/* 明細テーブル */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left px-3 py-2">品目・内容</th>
              <th className="text-right px-3 py-2">数量</th>
              <th className="text-right px-3 py-2">単価</th>
              <th className="text-right px-3 py-2">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">¥{item.unit_price.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-medium">¥{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 合計 */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">小計</span>
              <span>¥{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">消費税 ({Math.round(invoice.tax_rate * 100)}%)</span>
              <span>¥{invoice.tax_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
              <span>合計金額</span>
              <span>¥{invoice.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-500 mb-1">備考</div>
            <div className="text-sm whitespace-pre-wrap">{invoice.notes}</div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          nav, .print\\:hidden { display: none !important; }
          body { background: white; }
          #invoice-body { margin: 0; }
        }
      `}</style>
    </>
  );
}
