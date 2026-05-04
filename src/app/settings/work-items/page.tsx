import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { db, workItems } from "@/db";
import { asc } from "drizzle-orm";
import { WorkItemsManager } from "@/components/work-items-manager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function WorkItemsPage() {
  const [session, items] = await Promise.all([
    auth(),
    db.select().from(workItems).orderBy(asc(workItems.displayOrder)),
  ]);

  const isOwner = (session?.user as { role?: string })?.role === "owner";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold hover:text-blue-600 transition-colors">
              バイク屋管理
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 font-medium">作業マスタ</span>
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

      <main className="max-w-4xl mx-auto p-6">
        <WorkItemsManager initialItems={items} isOwner={isOwner} />
      </main>
    </div>
  );
}
