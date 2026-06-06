"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVehicleAction } from "@/app/customers/[id]/vehicles/[vehicleId]/edit/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  vehicleId: number;
  customerId: number;
  vehicleName: string;
};

export function VehicleDeleteButton({ vehicleId, customerId, vehicleName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      !window.confirm(
        `「${vehicleName}」を削除しますか？\n関連する整備記録もすべて削除されます。`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteVehicleAction(customerId, vehicleId);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleDelete}
      className="text-sm h-9 text-red-600 hover:text-red-700 hover:border-red-300"
    >
      <Trash2 className="w-3.5 h-3.5 mr-1" />
      {isPending ? "削除中..." : "削除"}
    </Button>
  );
}
