"use client";

import { useState } from "react";
import { MaintenanceQuickAdd } from "@/components/maintenance-quick-add";
import type { WorkItem } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

type Props = {
  vehicleId: number;
  customerId: number;
  workItems: WorkItem[];
};

export function VehicleQuickAddPanel({ vehicleId, customerId, workItems }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button
        variant={isOpen ? "secondary" : "outline"}
        size="sm"
        className="text-xs h-7 gap-1"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Plus className="w-3 h-3" />
        整備追加
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {isOpen && (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
          <MaintenanceQuickAdd vehicleId={vehicleId} customerId={customerId} workItems={workItems} />
        </div>
      )}
    </div>
  );
}
