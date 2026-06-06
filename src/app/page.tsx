import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VisitorBar } from "@/components/visitor-bar";
import { TodayVisits } from "@/components/today-visits";
import { getActiveWorkItems, getTodayMaintenanceSummary } from "@/lib/queries/maintenance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, PlusCircle, Settings, LogOut, Bike, ClipboardList } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [workItems, todaySummary] = await Promise.all([
    getActiveWorkItems(),
    getTodayMaintenanceSummary(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Bike className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-base hidden sm:inline">バイク屋管理</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/customers">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">顧客一覧</span>
              </Button>
            </Link>

            <Link href="/maintenance/batch">
              <Button size="sm" variant="ghost" className="gap-1.5">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">まとめて入力</span>
              </Button>
            </Link>

            <Link href="/customers/new">
              <Button size="sm" variant="default" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">新規登録</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="gap-1.5">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">設定</span>
                </Button>
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
                <DropdownMenuItem asChild>
                  <Link href="/settings/import">データ取り込み</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/backup">バックアップ</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xs text-gray-400 hidden md:inline">{session.user.name}</span>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" size="sm" variant="ghost" className="gap-1.5">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ログアウト</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* 来店受付：検索バー＋本日の来店記録 */}
      <main className={`max-w-3xl mx-auto px-4 pb-16 ${todaySummary.recordCount > 0 ? "pt-[8vh]" : "pt-[18vh]"}`}>
        <div className="text-center mb-6">
          <Bike className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-700">来店受付</h1>
          <p className="text-sm text-gray-400 mt-1">お客様の名前・電話番号で検索してカルテを開きます</p>
        </div>
        <VisitorBar workItems={workItems} />
        <TodayVisits summary={todaySummary} />
      </main>
    </div>
  );
}
