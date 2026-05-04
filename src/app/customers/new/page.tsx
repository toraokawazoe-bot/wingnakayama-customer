import Link from "next/link";
import { CustomerForm } from "@/components/customer-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "新規顧客登録 | バイク屋管理システム",
};

export default function NewCustomerPage() {
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
          <h1 className="text-lg font-semibold">新規顧客登録</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <CustomerForm mode="create" />
        </div>
      </main>
    </div>
  );
}
