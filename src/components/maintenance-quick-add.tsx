"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  quickAddMaintenanceAction,
  customMaintenanceAddAction,
} from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { WorkItem } from "@/lib/queries/maintenance";
import { getCategoryIcon } from "@/lib/constants/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

type Props = {
  vehicleId: number;
  customerId: number;
  workItems: WorkItem[];
};

export function MaintenanceQuickAdd({ vehicleId, customerId, workItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [isCustomPending, startCustomTransition] = useTransition();

  const categories = Array.from(new Set(workItems.map((w) => w.category ?? "その他")));

  function handleClick(item: WorkItem) {
    if (isPending) return;
    setPendingId(item.id);

    startTransition(async () => {
      const result = await quickAddMaintenanceAction(vehicleId, customerId, item.id);
      setPendingId(null);

      if (result.ok) {
        toast.success(`「${item.name}」を追加しました`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCustomAdd() {
    const price = parseInt(customPrice, 10);
    if (!customName.trim()) {
      toast.error("作業内容を入力してください");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("金額は0以上の整数で入力してください");
      return;
    }

    startCustomTransition(async () => {
      const result = await customMaintenanceAddAction(vehicleId, customerId, customName, price);
      if (result.ok) {
        toast.success(`「${customName.trim()}」を追加しました`);
        setCustomName("");
        setCustomPrice("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const CategoryIcon = getCategoryIcon(category);
        return (
          <div key={category}>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <CategoryIcon className="w-3.5 h-3.5" />
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
                    disabled={isPending || isCustomPending}
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
        );
      })}

      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          カスタム入力
        </h3>
        <div className="flex gap-2 items-start flex-wrap">
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="作業内容"
            className="w-48"
            disabled={isCustomPending || isPending}
            onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">¥</span>
            <Input
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="0"
              type="number"
              min="0"
              className="w-28 pl-7"
              disabled={isCustomPending || isPending}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
            />
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={handleCustomAdd}
            disabled={isCustomPending || isPending}
            className="text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> 追加
          </Button>
        </div>
      </div>
    </div>
  );
}
