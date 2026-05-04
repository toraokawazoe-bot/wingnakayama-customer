"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomerAction } from "@/app/customers/[id]/edit/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type Props = {
  customerId: number;
  customerName: string;
};

export function CustomerDeleteButton({ customerId, customerName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (
      !window.confirm(
        `「${customerName}」を削除しますか？\n関連する車両・整備記録もすべて削除されます。`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCustomerAction(customerId);
      if (result.ok) {
        router.push("/");
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
      className="text-red-600 hover:text-red-700 hover:border-red-300"
    >
      <Trash2 className="w-4 h-4 mr-1" />
      {isPending ? "削除中..." : "削除"}
    </Button>
  );
}
