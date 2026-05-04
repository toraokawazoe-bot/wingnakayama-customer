"use client";

import { useState, useTransition } from "react";
import { quickAddMaintenanceAction } from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { WorkItem } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";

type Props = {
  vehicleId: number;
  workItems: WorkItem[];
};

export function MaintenanceQuickAdd({ vehicleId, workItems }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const categories = Array.from(new Set(workItems.map((w) => w.category ?? "その他")));

  function handleClick(item: WorkItem) {
    if (isPending) return;
    setPendingId(item.id);

    startTransition(async () => {
      const result = await quickAddMaintenanceAction(vehicleId, item.id);
      setPendingId(null);

      if (result.ok) {
        setToast({ type: "success", message: `「${item.name}」を追加しました` });
      } else {
        setToast({ type: "error", message: result.error });
      }

      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={`px-4 py-2 rounded text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {workItems
              .filter((w) => (w.category ?? "その他") === category)
              .map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="default"
                  disabled={isPending}
                  onClick={() => handleClick(item)}
                  className={`text-sm ${pendingId === item.id ? "opacity-60" : ""}`}
                >
                  {item.name}
                  <span className="ml-2 text-gray-500">
                    ¥{item.defaultPrice.toLocaleString()}
                  </span>
                </Button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
