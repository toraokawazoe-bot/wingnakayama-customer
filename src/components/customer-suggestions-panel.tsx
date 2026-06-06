"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { quickAddMaintenanceAction } from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { CustomerSuggestion } from "@/lib/queries/customer-suggestions";
import type { WorkItem } from "@/lib/queries/maintenance";
import { Button } from "@/components/ui/button";
import { Check, Lightbulb } from "lucide-react";

type Props = {
  customerId: number;
  suggestions: CustomerSuggestion[];
  workItems: WorkItem[];
};

// 提案キーワードに合致する作業マスタを探す（キーワード順 = 優先順）
function matchWorkItem(keywords: string[], workItems: WorkItem[]): WorkItem | null {
  for (const kw of keywords) {
    const hit = workItems.find((w) => w.name.includes(kw));
    if (hit) return hit;
  }
  return null;
}

const URGENCY_STYLE = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
} as const;

const URGENCY_BADGE = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
} as const;

export function CustomerSuggestionsPanel({ customerId, suggestions, workItems }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // 記録済みの提案はその場で✓表示にする（refreshで再計算されるまでの間）
  const [doneKeys, setDoneKeys] = useState<Set<string>>(new Set());

  if (suggestions.length === 0) return null;

  function handleRecord(s: CustomerSuggestion, item: WorkItem, key: string) {
    if (isPending) return;
    setPendingKey(key);
    startTransition(async () => {
      const result = await quickAddMaintenanceAction(s.vehicleId, customerId, item.id);
      setPendingKey(null);
      if (result.ok) {
        toast.success(`「${item.name}」を記録しました`);
        setDoneKeys((prev) => new Set(prev).add(key));
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border-2 border-blue-200 p-5">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        本日のご提案
        <span className="text-xs font-normal text-gray-400">（接客時にそのままお声がけください）</span>
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((s) => {
          const key = `${s.type}-${s.vehicleId}`;
          const item = matchWorkItem(s.workKeywords, workItems);
          const done = doneKeys.has(key);
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 flex items-start justify-between gap-2 ${
                done ? "border-green-200 bg-green-50" : URGENCY_STYLE[s.urgency]
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!done && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${URGENCY_BADGE[s.urgency]}`}>
                      {s.urgency === "high" ? "急" : "推奨"}
                    </span>
                  )}
                  {done && <Check className="w-3.5 h-3.5 text-green-600" />}
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {s.vehicleLabel} ・ {s.detail}
                </div>
              </div>
              {item && !done && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs bg-white"
                  disabled={isPending}
                  onClick={() => handleRecord(s, item, key)}
                >
                  {pendingKey === key ? "記録中..." : `実施を記録 ¥${item.defaultPrice.toLocaleString()}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
