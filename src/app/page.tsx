import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { VisitorBar } from "@/components/visitor-bar";
import { SidebarStats } from "@/components/sidebar-stats";
import {
  getOilChangeAlerts,
  getInspectionAlerts,
  getCompulsoryInsuranceAlerts,
  getInspectionExpiryAlerts,
  getDormantCustomerAlerts,
} from "@/lib/queries/maintenance-alerts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const URGENCY_COLOR = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-blue-50 border-blue-200 text-blue-700",
} as const;

const URGENCY_BADGE = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
} as const;

function AlertSection({
  title,
  count,
  urgencyColor,
  children,
}: {
  title: string;
  count: number;
  urgencyColor: keyof typeof URGENCY_COLOR;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className={`flex items-center justify-between px-5 py-3 rounded-t-xl border-b ${URGENCY_COLOR[urgencyColor]}`}>
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_BADGE[urgencyColor]}`}>
          {count}件
        </span>
      </div>
      <div className="divide-y">
        {children}
      </div>
    </section>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="px-5 py-4 text-sm text-gray-400 text-center">{message}</div>
  );
}

export default async function Home() {
  const [
    session,
    oilAlerts,
    inspectionAlerts,
    insuranceAlerts,
    inspectionExpiryAlerts,
    dormantAlerts,
  ] = await Promise.all([
    auth(),
    getOilChangeAlerts(),
    getInspectionAlerts(),
    getCompulsoryInsuranceAlerts(),
    getInspectionExpiryAlerts(),
    getDormantCustomerAlerts(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">バイク屋管理システム</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session?.user?.name ?? "ユーザー"}</span>
            <Link href="/customers">
              <Button size="sm" variant="ghost">顧客一覧</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">設定 ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings/shop">店舗情報</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/work-items">作業マスタ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/parts">部品マスタ</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/customers/new">
              <Button size="sm">新規顧客登録</Button>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" size="sm" variant="outline">ログアウト</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* 来店受付（全幅） */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">来店受付</h2>
          <VisitorBar />
        </section>

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左: アラートセクション（8カラム） */}
          <section className="lg:col-span-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">アクションが必要なお客さん</h2>
          <div className="grid grid-cols-1 gap-4">

            {/* オイル交換 */}
            <AlertSection
              title="オイル交換が必要"
              count={oilAlerts.length}
              urgencyColor={oilAlerts.some((a) => a.urgency === "high") ? "high" : oilAlerts.length > 0 ? "medium" : "low"}
            >
              {oilAlerts.length === 0 ? (
                <EmptyRow message="対象なし" />
              ) : (
                oilAlerts.slice(0, 5).map((a) => (
                  <Link
                    key={`oil-${a.vehicleId}`}
                    href={`/customers/${a.customerId}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-sm">{a.customerLastName} {a.customerFirstName}</span>
                      <span className="ml-2 text-xs text-gray-500">{a.vehicleMaker} {a.vehicleModelName}</span>
                      {a.vehiclePlateNumber && (
                        <span className="ml-1 text-xs text-gray-400">{a.vehiclePlateNumber}</span>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${URGENCY_BADGE[a.urgency]}`}>
                        {a.prediction.stage === "predictive"
                          ? `予測残り${a.prediction.predictedRemainingDays}日`
                          : a.prediction.stage === "initial"
                          ? `前回から${a.prediction.daysSinceLast}日`
                          : "データなし"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {oilAlerts.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400 text-center">他{oilAlerts.length - 5}件</div>
              )}
            </AlertSection>

            {/* 点検タイミング */}
            <AlertSection
              title="点検未実施"
              count={inspectionAlerts.length}
              urgencyColor={inspectionAlerts.some((a) => a.urgency === "high") ? "high" : inspectionAlerts.length > 0 ? "medium" : "low"}
            >
              {inspectionAlerts.length === 0 ? (
                <EmptyRow message="対象なし" />
              ) : (
                inspectionAlerts.slice(0, 5).map((a) => (
                  <Link
                    key={`insp-${a.vehicleId}`}
                    href={`/customers/${a.customerId}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-sm">{a.customerLastName} {a.customerFirstName}</span>
                      <span className="ml-2 text-xs text-gray-500">{a.vehicleMaker} {a.vehicleModelName}</span>
                    </div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${URGENCY_BADGE[a.urgency]}`}>
                        {a.lastInspectionAt
                          ? `前回から${a.daysSinceLast}日`
                          : "点検記録なし"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {inspectionAlerts.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400 text-center">他{inspectionAlerts.length - 5}件</div>
              )}
            </AlertSection>

            {/* 自賠責 */}
            <AlertSection
              title="自賠責保険 期限間近"
              count={insuranceAlerts.length}
              urgencyColor={insuranceAlerts.some((a) => a.urgency === "high") ? "high" : insuranceAlerts.length > 0 ? "medium" : "low"}
            >
              {insuranceAlerts.length === 0 ? (
                <EmptyRow message="対象なし" />
              ) : (
                insuranceAlerts.slice(0, 5).map((a, i) => (
                  <Link
                    key={`ins-${a.vehicleId}-${i}`}
                    href={`/customers/${a.customerId}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-sm">{a.customerLastName} {a.customerFirstName}</span>
                      <span className="ml-2 text-xs text-gray-500">{a.vehicleMaker} {a.vehicleModelName}</span>
                      {a.vehiclePlateNumber && (
                        <span className="ml-1 text-xs text-gray-400">{a.vehiclePlateNumber}</span>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${URGENCY_BADGE[a.urgency]}`}>
                        {a.endDate} まで（残{a.daysUntilExpiry}日）
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {insuranceAlerts.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400 text-center">他{insuranceAlerts.length - 5}件</div>
              )}
            </AlertSection>

            {/* 車検満了 */}
            <AlertSection
              title="車検 期限間近（251cc以上）"
              count={inspectionExpiryAlerts.length}
              urgencyColor={inspectionExpiryAlerts.some((a) => a.urgency === "high") ? "high" : inspectionExpiryAlerts.length > 0 ? "medium" : "low"}
            >
              {inspectionExpiryAlerts.length === 0 ? (
                <EmptyRow message="対象なし" />
              ) : (
                inspectionExpiryAlerts.slice(0, 5).map((a, i) => (
                  <Link
                    key={`exp-${a.vehicleId}-${i}`}
                    href={`/customers/${a.customerId}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-sm">{a.customerLastName} {a.customerFirstName}</span>
                      <span className="ml-2 text-xs text-gray-500">{a.vehicleMaker} {a.vehicleModelName} {a.displacement}cc</span>
                      {a.vehiclePlateNumber && (
                        <span className="ml-1 text-xs text-gray-400">{a.vehiclePlateNumber}</span>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${URGENCY_BADGE[a.urgency]}`}>
                        {a.expiryDate} まで（残{a.daysUntilExpiry}日）
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {inspectionExpiryAlerts.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400 text-center">他{inspectionExpiryAlerts.length - 5}件</div>
              )}
            </AlertSection>

            {/* 長期未来店 */}
            <AlertSection
              title="長期未来店（6ヶ月以上）"
              count={dormantAlerts.length}
              urgencyColor={dormantAlerts.some((a) => a.urgency === "high") ? "high" : dormantAlerts.length > 0 ? "medium" : "low"}
            >
              {dormantAlerts.length === 0 ? (
                <EmptyRow message="対象なし" />
              ) : (
                dormantAlerts.slice(0, 5).map((a) => (
                  <Link
                    key={`dorm-${a.customerId}`}
                    href={`/customers/${a.customerId}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-sm">{a.customerLastName} {a.customerFirstName}</span>
                    <div className="text-right text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${URGENCY_BADGE[a.urgency]}`}>
                        {a.lastVisitAt
                          ? `最終来店 ${a.lastVisitAt}（${a.daysSinceLast}日前）`
                          : "来店記録なし"}
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {dormantAlerts.length > 5 && (
                <div className="px-5 py-2 text-xs text-gray-400 text-center">他{dormantAlerts.length - 5}件</div>
              )}
            </AlertSection>

          </div>
          </section>

          {/* 右: サイドバー（4カラム） */}
          <section className="lg:col-span-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">在庫・今月</h2>
            <SidebarStats />
          </section>
        </div>
      </main>
    </div>
  );
}
