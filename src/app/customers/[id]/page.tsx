import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerById } from "@/lib/queries/customers";
import { getVehiclesByCustomerId } from "@/lib/queries/vehicles";
import { getCustomerSummary } from "@/lib/queries/customer-stats";
import { getActiveWorkItems } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ChevronLeft, ClipboardList, Pencil, Plus } from "lucide-react";
import { CustomerDeleteButton } from "@/components/customer-delete-button";
import { VehicleDeleteButton } from "@/components/vehicle-delete-button";
import { VehicleQuickAddPanel } from "@/components/vehicle-quick-add-panel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    notFound();
  }

  const customer = await getCustomerById(customerId);

  if (!customer) {
    notFound();
  }

  const [vehicleList, summary, workItems] = await Promise.all([
    getVehiclesByCustomerId(customerId),
    getCustomerSummary(customerId),
    getActiveWorkItems(),
  ]);
  const isOwner = (session.user as { role?: string }).role === "owner";

  const fullName = `${customer.lastName} ${customer.firstName}`;
  const fullKana =
    customer.lastNameKana || customer.firstNameKana
      ? `${customer.lastNameKana ?? ""} ${customer.firstNameKana ?? ""}`.trim()
      : null;
  const fullAddress = [customer.prefecture, customer.city, customer.addressLine]
    .filter(Boolean)
    .join("");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">{fullName} 様</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* サマリーカード */}
        <section className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-base font-semibold mb-4">利用サマリ</h2>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {summary.totalAmount > 0 ? `¥${summary.totalAmount.toLocaleString()}` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">累計利用額</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {summary.visitCount > 0 ? `${summary.visitCount}回` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">来店回数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">
                {summary.lastVisitAt
                  ? (() => {
                      const days = Math.round((Date.now() - new Date(summary.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24));
                      return days < 30 ? `${days}日前` : days < 365 ? `${Math.round(days / 30)}ヶ月前` : `${Math.round(days / 365)}年前`;
                    })()
                  : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {summary.lastVisitAt ? `最終来店 ${summary.lastVisitAt}` : "来店記録なし"}
              </div>
            </div>
          </div>

          {summary.majorWorkHistory.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">主要作業 最終実施</h3>
              <div className="space-y-2">
                {summary.majorWorkHistory.map((h) => (
                  <div key={h.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium w-14 text-center">
                        {h.category}
                      </span>
                      <span className="text-gray-700">{h.workName}</span>
                    </div>
                    <div className="text-right text-xs text-gray-500 shrink-0 ml-2">
                      <span className={`font-medium ${
                        h.daysAgo >= 365 ? "text-red-600"
                        : h.daysAgo >= 180 ? "text-amber-600"
                        : "text-gray-600"
                      }`}>
                        {h.daysAgo < 30 ? `${h.daysAgo}日前`
                          : h.daysAgo < 365 ? `${Math.round(h.daysAgo / 30)}ヶ月前`
                          : `${Math.round(h.daysAgo / 365)}年前`}
                      </span>
                      <span className="ml-1 text-gray-400">({h.performedAt})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 基本情報 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">基本情報</h2>
            <div className="flex gap-2">
              <Link href={`/customers/${customerId}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="w-4 h-4 mr-1" />
                  編集
                </Button>
              </Link>
              {isOwner && (
                <CustomerDeleteButton customerId={customerId} customerName={fullName} />
              )}
            </div>
          </div>

          <dl className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
            <dt className="text-gray-600">お名前</dt>
            <dd>{fullName}</dd>

            {fullKana && (
              <>
                <dt className="text-gray-600">フリガナ</dt>
                <dd>{fullKana}</dd>
              </>
            )}

            {customer.phone && (
              <>
                <dt className="text-gray-600">電話番号</dt>
                <dd>{customer.phone}</dd>
              </>
            )}

            {customer.email && (
              <>
                <dt className="text-gray-600">メールアドレス</dt>
                <dd>{customer.email}</dd>
              </>
            )}

            {(customer.postalCode || fullAddress) && (
              <>
                <dt className="text-gray-600">住所</dt>
                <dd>
                  {customer.postalCode && (
                    <div className="text-gray-500">〒{customer.postalCode}</div>
                  )}
                  {fullAddress}
                </dd>
              </>
            )}

            {customer.birthday && (
              <>
                <dt className="text-gray-600">生年月日</dt>
                <dd>{customer.birthday}</dd>
              </>
            )}

            <dt className="text-gray-600">登録日</dt>
            <dd>
              {customer.createdAt instanceof Date
                ? customer.createdAt.toLocaleDateString("ja-JP")
                : ""}
            </dd>
          </dl>

          {customer.memo && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-1">メモ</div>
              <div className="text-sm whitespace-pre-wrap">{customer.memo}</div>
            </div>
          )}
        </section>

        {/* 車両 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">車両</h2>
            <Link href={`/customers/${customerId}/vehicles/new`}>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                車両を追加
              </Button>
            </Link>
          </div>

          {vehicleList.length === 0 ? (
            <EmptyState message="車両は未登録です" />
          ) : (
            <ul className="divide-y">
              {vehicleList.map((v) => (
                <li key={v.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{v.maker} {v.modelName}</span>
                      {v.displacement && (
                        <span className="ml-2 text-gray-500">{v.displacement}cc</span>
                      )}
                    </div>
                    {v.plateNumber && (
                      <span className="text-gray-600 font-mono">{v.plateNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-gray-400 text-xs">
                      {v.firstRegistrationDate && <span>初年度: {v.firstRegistrationDate} </span>}
                      {v.createdAt instanceof Date && (
                        <span>登録: {v.createdAt.toLocaleDateString("ja-JP")}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/customers/${customerId}/vehicles/${v.id}/maintenance`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-gray-500">
                          <ClipboardList className="w-3 h-3 mr-1" />
                          履歴
                        </Button>
                      </Link>
                      <Link href={`/customers/${customerId}/vehicles/${v.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-gray-500">
                          <Pencil className="w-3 h-3 mr-1" />
                          編集
                        </Button>
                      </Link>
                      {isOwner && (
                        <VehicleDeleteButton
                          vehicleId={v.id}
                          customerId={customerId}
                          vehicleName={`${v.maker} ${v.modelName}`}
                        />
                      )}
                    </div>
                  </div>
                  <VehicleQuickAddPanel vehicleId={v.id} customerId={customerId} workItems={workItems} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
