import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "@/components/customer-search";
import { getCustomersWithVehicles } from "@/lib/queries/dashboard";

export default async function Home() {
  const [session, initialData] = await Promise.all([
    auth(),
    getCustomersWithVehicles(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">バイク屋管理システム</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {session?.user?.name ?? "ユーザー"}
            </span>
            <Link href="/settings/shop">
              <Button size="sm" variant="ghost">設定</Button>
            </Link>
            <Link href="/customers/new">
              <Button size="sm">新規顧客登録</Button>
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" size="sm" variant="outline">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <CustomerSearch initialData={initialData} />
      </main>
    </div>
  );
}
