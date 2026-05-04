import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { CustomerListTable } from "@/components/customer-list-table";
import { getCustomersWithVehicles } from "@/lib/queries/dashboard";
import { getCustomerStatsMap } from "@/lib/queries/customer-stats";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function CustomersPage() {
  const [session, customers] = await Promise.all([
    auth(),
    getCustomersWithVehicles(),
  ]);

  const statsMap = await getCustomerStatsMap(customers.map((c) => c.id));
  const rows = customers.map((c) => ({
    ...c,
    stats: statsMap.get(c.id) ?? { totalAmount: 0, visitCount: 0, lastVisitAt: null },
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold hover:text-blue-600 transition-colors">
              バイク屋管理
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 font-medium">顧客一覧</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session?.user?.name ?? "ユーザー"}</span>
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

      <main className="max-w-6xl mx-auto p-6">
        <CustomerListTable initialRows={rows} />
      </main>
    </div>
  );
}
