"use client";
import Link from "next/link";
import BikeForm from "@/components/BikeForm";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NewBikeContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer_id") || "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/bikes" className="text-gray-500 hover:text-gray-700">← 車両一覧</Link>
        <h1 className="text-2xl font-bold text-gray-800">車両登録</h1>
      </div>
      <BikeForm defaultCustomerId={customerId} />
    </div>
  );
}

export default function NewBikePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">読み込み中...</div>}>
      <NewBikeContent />
    </Suspense>
  );
}
