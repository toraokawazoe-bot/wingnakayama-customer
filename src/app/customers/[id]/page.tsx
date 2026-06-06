import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerById } from "@/lib/queries/customers";
import { getVehiclesByCustomerId } from "@/lib/queries/vehicles";
import { getCustomerSummary } from "@/lib/queries/customer-stats";
import { getActiveWorkItems, getMaintenanceRecordsByCustomerId } from "@/lib/queries/maintenance";
import { getDealsByCustomerId } from "@/lib/queries/deals";
import { getCustomerSuggestions } from "@/lib/queries/customer-suggestions";
import { todayJst } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Cake, ChevronLeft, ClipboardList, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { CustomerDeleteButton } from "@/components/customer-delete-button";
import { VehicleDeleteButton } from "@/components/vehicle-delete-button";
import { MaintenancePickerDialog } from "@/components/maintenance-picker-dialog";
import { DealsPanel } from "@/components/deals-panel";
import { CustomerMaintenanceHistory } from "@/components/customer-maintenance-history";
import { CustomerSuggestionsPanel } from "@/components/customer-suggestions-panel";

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

  const [vehicleList, summary, workItems, dealList, maintenanceList, suggestions] = await Promise.all([
    getVehiclesByCustomerId(customerId),
    getCustomerSummary(customerId),
    getActiveWorkItems(),
    getDealsByCustomerId(customerId),
    getMaintenanceRecordsByCustomerId(customerId),
    getCustomerSuggestions(customerId),
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

  // 生年月日から年齢を計算（パースできない形式なら非表示）
  const age = (() => {
    if (!customer.birthday) return null;
    const b = new Date(customer.birthday);
    if (isNaN(b.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">{fullName} 様</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 sm:py-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* 顧客情報（カルテの顔・基本情報＋利用サマリを1枚に） */}
        <section className="lg:col-span-2 bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
            {/* 左：基本情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {fullKana && (
                    <div className="text-xs text-gray-400 tracking-wider">{fullKana}</div>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                    {fullName}
                    <span className="text-base font-normal text-gray-500 ml-1">様</span>
                  </h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/customers/${customerId}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">編集</span>
                    </Button>
                  </Link>
                  {isOwner && (
                    <CustomerDeleteButton customerId={customerId} customerName={fullName} />
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-1.5 text-blue-700 font-semibold text-lg"
                  >
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5 text-gray-600 break-all">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    {customer.email}
                  </span>
                )}
                {customer.birthday && (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Cake className="w-4 h-4 text-gray-400" />
                    {customer.birthday}
                    {age !== null && <span className="text-gray-400">（{age}歳）</span>}
                  </span>
                )}
              </div>

              {(customer.postalCode || fullAddress) && (
                <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span>
                    {customer.postalCode && (
                      <span className="text-gray-400 mr-1.5">〒{customer.postalCode}</span>
                    )}
                    {fullAddress}
                  </span>
                </div>
              )}

              {customer.memo && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm whitespace-pre-wrap">
                  {customer.memo}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-400">
                登録日{" "}
                {customer.createdAt instanceof Date
                  ? customer.createdAt.toLocaleDateString("ja-JP")
                  : ""}
              </div>
            </div>

            {/* 右：利用サマリ（カードを分けず一目で） */}
            <div className="lg:w-64 shrink-0 lg:border-l lg:pl-6 space-y-2">
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                <span className="text-xs font-medium text-green-800/70">累計利用額</span>
                <span className="text-xl font-bold text-green-700">
                  {summary.totalAmount > 0 ? `¥${summary.totalAmount.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2.5">
                <span className="text-xs font-medium text-blue-800/70">来店回数</span>
                <span className="text-xl font-bold text-blue-700">
                  {summary.visitCount > 0 ? `${summary.visitCount}回` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2.5">
                <span className="text-xs font-medium text-gray-500">最終来店</span>
                <span className="text-right">
                  <span className="text-xl font-bold text-gray-700">
                    {summary.lastVisitAt
                      ? (() => {
                          const days = Math.round((Date.now() - new Date(summary.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24));
                          return days <= 0 ? "今日" : days === 1 ? "昨日" : days < 30 ? `${days}日前` : days < 365 ? `${Math.round(days / 30)}ヶ月前` : `${Math.round(days / 365)}年前`;
                        })()
                      : "—"}
                  </span>
                  {summary.lastVisitAt && (
                    <span className="block text-[10px] text-gray-400 -mt-0.5">{summary.lastVisitAt}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 本日のご提案（全幅・接客時の声がけ用） */}
        {suggestions.length > 0 && (
          <div className="lg:col-span-2">
            <CustomerSuggestionsPanel
              customerId={customerId}
              suggestions={suggestions}
              workItems={workItems}
            />
          </div>
        )}

        {/* 左ペイン：車両・整備履歴 */}
        <div className="space-y-4 sm:space-y-6">
        {/* 車両 */}
        <section className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
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
                <li key={v.id} className="py-4 first:pt-0 last:pb-0 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold">{v.maker} {v.modelName}</span>
                        {v.displacement && (
                          <span className="text-gray-500">{v.displacement}cc</span>
                        )}
                        {v.plateNumber && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">
                            {v.plateNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {v.firstRegistrationDate && <span className="mr-3">初年度 {v.firstRegistrationDate}</span>}
                        {v.createdAt instanceof Date && (
                          <span>登録 {v.createdAt.toLocaleDateString("ja-JP")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Link href={`/customers/${customerId}/vehicles/${v.id}/maintenance`}>
                        <Button variant="ghost" size="sm" className="text-sm h-9 px-2.5 text-gray-500">
                          <ClipboardList className="w-4 h-4 mr-1" />
                          履歴
                        </Button>
                      </Link>
                      <Link href={`/customers/${customerId}/vehicles/${v.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-sm h-9 px-2.5 text-gray-500">
                          <Pencil className="w-4 h-4 mr-1" />
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
                  <div className="mt-3">
                    <MaintenancePickerDialog
                      vehicleId={v.id}
                      customerId={customerId}
                      workItems={workItems}
                      vehicleName={`${v.maker} ${v.modelName}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 整備履歴（全車両横断） */}
        <section className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">整備履歴</h2>
            <span className="text-xs text-gray-400">{maintenanceList.length}件</span>
          </div>
          <CustomerMaintenanceHistory
            records={maintenanceList}
            customerId={customerId}
            isOwner={isOwner}
            showVehicle={vehicleList.length > 1}
          />
        </section>
        </div>

        {/* 右ペイン：購入記録 */}
        <div className="space-y-4 sm:space-y-6">
        <DealsPanel
          customerId={customerId}
          deals={dealList}
          isOwner={isOwner}
          today={todayJst()}
        />
        </div>
      </main>
    </div>
  );
}
