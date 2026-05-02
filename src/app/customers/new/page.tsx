import Link from "next/link";
import CustomerForm from "@/components/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-gray-500 hover:text-gray-700">← 顧客一覧</Link>
        <h1 className="text-2xl font-bold text-gray-800">新規顧客登録</h1>
      </div>
      <CustomerForm />
    </div>
  );
}
