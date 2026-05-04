import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMaintenanceRecordById } from "@/lib/queries/maintenance";
import { SHOP_NAME, SHOP_OWNER, SHOP_ADDRESS, SHOP_PHONE, SHOP_REGISTRATION_NUMBER } from "@/lib/constants/shop";
import { PrintButton } from "./print-button";

type PageProps = {
  params: Promise<{ recordId: string }>;
};

export default async function ReceiptPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { recordId } = await params;
  const id = parseInt(recordId, 10);

  if (isNaN(id)) {
    notFound();
  }

  const record = await getMaintenanceRecordById(id);

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

            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-1">金額</p>
              <p className="text-4xl font-bold tracking-tight">
                ¥{record.price.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">（消費税込）</p>
            </div>

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
                  <td className="py-2 text-right">¥{record.price.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-4 border-t space-y-1 text-sm text-gray-700">
              <p className="font-semibold text-base">{SHOP_NAME}</p>
              {SHOP_OWNER && <p>店主: {SHOP_OWNER}</p>}
              {SHOP_ADDRESS && <p>{SHOP_ADDRESS}</p>}
              {SHOP_PHONE && <p>TEL: {SHOP_PHONE}</p>}
              {SHOP_REGISTRATION_NUMBER && (
                <p className="text-xs text-gray-400">登録番号: {SHOP_REGISTRATION_NUMBER}</p>
              )}
              <p className="text-xs text-gray-400 pt-2">発行日: {issuedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
