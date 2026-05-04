import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShopSettings } from "@/lib/queries/shop";
import { ShopSettingsForm } from "@/components/shop-settings-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function ShopSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const shop = await getShopSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              ホームに戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">店舗情報設定</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <ShopSettingsForm initialData={shop} />
        </div>
      </main>
    </div>
  );
}
