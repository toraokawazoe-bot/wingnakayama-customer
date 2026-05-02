"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import BikeForm from "@/components/BikeForm";

type Bike = {
  id: number;
  customer_id: number;
  vehicle_type: string;
  maker: string;
  product_name: string;
  bike_type: string;
  color: string;
  registration_no: string;
  frame_no: string;
  displacement: number;
  year: number;
  purchase_date: string;
  notes: string;
};

export default function EditBikePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bike, setBike] = useState<Bike | null>(null);

  useEffect(() => {
    fetch(`/api/bikes/${id}`).then((r) => r.json()).then(setBike);
  }, [id]);

  if (!bike) return <div className="text-center py-20 text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/bikes/${id}`} className="text-gray-500 hover:text-gray-700">← 車両詳細</Link>
        <h1 className="text-2xl font-bold text-gray-800">車両情報編集</h1>
      </div>
      <BikeForm
        initial={{
          ...bike,
          customer_id: String(bike.customer_id),
          displacement: String(bike.displacement || ""),
          year: String(bike.year || ""),
        }}
        bikeId={bike.id}
      />
    </div>
  );
}
