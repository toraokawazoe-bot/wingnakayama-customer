"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMaintenanceRecordAction } from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { MaintenanceRecord } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getCategoryIcon } from "@/lib/constants/icons";
import { Pencil, Trash2 } from "lucide-react";

type Props = {
  records: MaintenanceRecord[];
  customerId: number;
  vehicleId: number;
};

function DeleteButton({
  recordId,
  workName,
  customerId,
  vehicleId,
}: {
  recordId: number;
  workName: string;
  customerId: number;
  vehicleId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm(`「${workName}」の記録を削除しますか？`)) return;

    startTransition(async () => {
      const result = await deleteMaintenanceRecordAction(recordId, customerId, vehicleId);
      if (result.ok) {
        toast.success(`「${workName}」を削除しました`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-500 hover:text-red-700 disabled:opacity-40 p-1"
      title="削除"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

export function MaintenanceHistory({ records, customerId, vehicleId }: Props) {
  if (records.length === 0) {
    return <EmptyState message="整備記録はまだありません" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500 bg-gray-50">
            <th className="px-3 py-2 font-medium">作業日</th>
            <th className="px-3 py-2 font-medium">作業内容</th>
            <th className="px-3 py-2 font-medium text-right">金額</th>
            <th className="px-3 py-2 font-medium text-right">走行距離</th>
            <th className="px-3 py-2 font-medium">担当</th>
            <th className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r, idx) => {
            const CategoryIcon = getCategoryIcon(r.category);
            return (
              <tr key={r.id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{r.performedAt}</td>
                <td className="px-3 py-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{r.workName}</span>
                  </div>
                  {r.memo && (
                    <div className="text-xs text-gray-400 mt-0.5 ml-5">{r.memo}</div>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-gray-800">
                  ¥{r.price.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right text-gray-600 font-mono text-xs">
                  {r.mileage != null ? `${r.mileage.toLocaleString()} km` : "—"}
                </td>
                <td className="px-3 py-3 text-gray-600">{r.staffName ?? "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/maintenance/${r.id}/receipt`}
                      className="text-blue-600 hover:underline text-xs mr-1"
                    >
                      領収書
                    </Link>
                    <Link href={`/maintenance/${r.id}/edit`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <DeleteButton
                      recordId={r.id}
                      workName={r.workName}
                      customerId={customerId}
                      vehicleId={vehicleId}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
