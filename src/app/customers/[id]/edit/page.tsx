"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import CustomerForm from "@/components/CustomerForm";

type Customer = {
  id: number;
  name: string;
  name_kana: string;
  phone: string;
  birthday: string;
  email: string;
  notes: string;
};

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetch(`/api/customers/${id}`).then((r) => r.json()).then(setCustomer);
  }, [id]);

  if (!customer) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/customers/${id}`} className="text-gray-500 hover:text-gray-700">← 顧客詳細</Link>
        <h1 className="text-2xl font-bold text-gray-800">顧客情報編集</h1>
      </div>
      <CustomerForm initial={customer} customerId={customer.id} />
    </div>
  );
}
