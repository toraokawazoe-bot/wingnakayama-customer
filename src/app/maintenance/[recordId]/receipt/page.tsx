import { notFound, redirect } from "next/navigation";
import { requireAuth, assertMaintenanceRecordAccess } from "@/lib/auth-guards";
import { getMaintenanceRecordById } from "@/lib/queries/maintenance";
import { getShopSettings } from "@/lib/queries/shop";
import { PrintButton } from "./print-button";

type PageProps = {
  params: Promise<{ recordId: string }>;
};

export default async function ReceiptPage({ params }: PageProps) {
  const authResult = await requireAuth();
  if (!authResult.ok) {
    redirect("/login");
  }

  const { recordId } = await params;
  const id = parseInt(recordId, 10);

  if (isNaN(id)) {
    notFound();
  }

  // IDOR ガード: recordId のアクセス権限確認（多店舗化時はここで shop 境界もチェック）
  const access = await assertMaintenanceRecordAccess(id);
  if (!access.ok) {
    notFound();
  }

  const [record, shop] = await Promise.all([
    getMaintenanceRecordById(id),
    getShopSettings(),
  ]);

  if (!record) {
    notFound();
  }

  const issuedDate = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const customerName = `${record.customerLastName} ${record.customerFirstName}`;
  const vehicleLabel = [record.vehicleMaker, record.vehicleModelName, record.vehiclePlateNumber]
    .filter(Boolean)
    .join(" ");

  const taxMode = shop?.taxMode ?? "inclusive";
  const taxRate = shop?.taxRate ?? 10;
  const price = record.price;

  // 税抜の場合: 本体価格と消費税を計算
  // price は税抜として扱う
  const taxAmount = taxMode === "exclusive" ? Math.round(price * taxRate / 100) : 0;
  const totalAmount = taxMode === "exclusive" ? price + taxAmount : price;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .receipt-container { box-shadow: none !important; border: none !important; }
        }
        @page {
          margin: 20mm;
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-lg">
          <div className="no-print mb-4 flex gap-2">
            <PrintButton />
          </div>

          <div className="receipt-container bg-white shadow-lg rounded-lg p-10 space-y-6">
            <h1 className="text-3xl font-bold text-center tracking-widest">領　収　書</h1>

            <div className="border-b pb-4">
              <p className="text-lg font-semibold">{customerName} 様</p>
              <p className="text-sm text-gray-500 mt-1">
                {vehicleLabel && `${vehicleLabel} の整備代金として`}
              </p>
            </div>

            {/* 金額ブロック */}
            {taxMode === "exclusive" ? (
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600 border-b pb-2">
                  <span>金額（税抜）</span>
                  <span>¥{price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 border-b pb-2">
                  <span>消費税（{taxRate}%）</span>
                  <span>¥{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>合計</span>
                  <span>¥{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-1">
                  {taxMode === "inclusive" ? "金額（税込）" : "金額"}
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  ¥{price.toLocaleString()}
                </p>
                {taxMode === "inclusive" && (
                  <p className="text-xs text-gray-400 mt-1">（消費税{taxRate}%込）</p>
                )}
              </div>
            )}

            <table className="w-full text-sm border-t border-b">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">作業日</th>
                  <th className="py-2 pr-4 font-medium">作業内容</th>
                  <th className="py-2 font-medium text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 pr-4 text-gray-600">{record.performedAt}</td>
                  <td className="py-2 pr-4">{record.workName}</td>
                  <td className="py-2 text-right">¥{price.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-4 border-t space-y-1 text-sm text-gray-700">
              <p className="font-semibold text-base">{shop?.shopName ?? ""}</p>
              {shop?.ownerName && <p>店主: {shop.ownerName}</p>}
              {shop?.address && <p>{shop.address}</p>}
              {shop?.phone && <p>TEL: {shop.phone}</p>}
              {shop?.registrationNumber && (
                <p className="text-xs text-gray-500 pt-1">
                  適格請求書発行事業者 登録番号: {shop.registrationNumber}
                </p>
              )}
              <p className="text-xs text-gray-400 pt-2">発行日: {issuedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
