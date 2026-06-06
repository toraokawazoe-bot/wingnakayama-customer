"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMaintenanceRecordAction } from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { CustomerMaintenanceRecord } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/constants/icons";
import { daysSinceJst } from "@/lib/date";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

const INITIAL_COUNT = 8;

// 「いつ・何日前にやったか」を一目で分かるように（半年〜は黄色・1年〜は赤）
function daysSince(dateStr: string): number {
  return Math.max(0, daysSinceJst(dateStr));
}

function relativeLabel(days: number): string {
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 30) return `${days}日前`;
  if (days < 365) return `${Math.round(days / 30)}ヶ月前`;
  return `${Math.round(days / 365)}年前`;
}

function relativePillStyle(days: number): string {
  if (days >= 365) return "bg-red-50 text-red-600";
  if (days >= 180) return "bg-amber-50 text-amber-700";
  if (days <= 1) return "bg-blue-50 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

type Props = {
  records: CustomerMaintenanceRecord[];
  customerId: number;
  isOwner: boolean;
  /** 複数台所有時のみ車両名を表示 */
  showVehicle: boolean;
};

function RecordDeleteButton({
  record,
  customerId,
}: {
  record: CustomerMaintenanceRecord;
  customerId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`「${record.workName}」の記録を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteMaintenanceRecordAction(record.id, customerId, record.vehicleId);
      if (result.ok) {
        toast.success(`「${record.workName}」を削除しました`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-gray-300 hover:text-red-500 disabled:opacity-40 h-9 w-9 flex items-center justify-center rounded hover:bg-red-50"
      title="削除"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function CustomerMaintenanceHistory({ records, customerId, isOwner, showVehicle }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (records.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        整備記録はまだありません（車両の「整備追加」から記録できます）
      </p>
    );
  }

  const visible = showAll ? records : records.slice(0, INITIAL_COUNT);

  return (
    <div>
      <ul className="divide-y">
        {visible.map((r) => {
          const CategoryIcon = getCategoryIcon(r.category);
          const days = daysSince(r.performedAt);
          return (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex items-center gap-3">
                {/* いつ・何日前か（一番知りたい情報を左端に固定幅で） */}
                <span
                  className={`w-16 shrink-0 text-center text-xs font-bold px-1 py-1.5 rounded-md ${relativePillStyle(days)}`}
                >
                  {relativeLabel(days)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-semibold text-[15px] truncate">{r.workName}</span>
                    {showVehicle && (
                      <span className="text-xs text-gray-400 truncate shrink-0">
                        {r.vehicleMaker} {r.vehicleModelName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{r.performedAt}</span>
                    {r.mileage != null && <span className="ml-2">{r.mileage.toLocaleString()} km</span>}
                    {r.staffName && <span className="ml-2">担当: {r.staffName}</span>}
                    {r.memo && <span className="ml-2">{r.memo}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-semibold text-gray-800">¥{r.price.toLocaleString()}</span>
                  <Link href={`/maintenance/${r.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-gray-400" title="編集">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </Link>
                  {isOwner && <RecordDeleteButton record={r} customerId={customerId} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!showAll && records.length > INITIAL_COUNT && (
        <button
          type="button"
          className="w-full mt-2 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded flex items-center justify-center gap-1 border border-dashed"
          onClick={() => setShowAll(true)}
        >
          <ChevronDown className="w-3.5 h-3.5" />
          すべて表示（残り {records.length - INITIAL_COUNT} 件）
        </button>
      )}
    </div>
  );
}
