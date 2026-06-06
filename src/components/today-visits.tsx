import Link from "next/link";
import type { TodaySummary } from "@/lib/queries/maintenance";
import { Printer, ChevronRight, JapaneseYen } from "lucide-react";

type Props = {
  summary: TodaySummary;
};

// 来店受付画面の「本日の来店記録」。今日誰が来て・何をやって・いくらかが一目で分かる。
export function TodayVisits({ summary }: Props) {
  if (summary.recordCount === 0) return null;

  return (
    <section className="w-full max-w-2xl mx-auto mt-10">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">
            本日の来店記録
            <span className="ml-2 text-xs font-normal text-gray-400">
              {summary.visits.length}名 / {summary.recordCount}件
            </span>
          </h2>
          <div className="flex items-center gap-1 text-base font-bold text-gray-900">
            <JapaneseYen className="w-4 h-4 text-gray-400" />
            {summary.totalAmount.toLocaleString()}
          </div>
        </div>

        <ul className="divide-y divide-gray-100">
          {summary.visits.map((visit) => (
            <li key={visit.customerId} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <Link
                  href={`/customers/${visit.customerId}`}
                  className="flex items-center gap-1 font-bold text-gray-900 hover:text-blue-700 group min-h-11"
                >
                  {visit.customerName}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                </Link>
                <span className="text-sm font-semibold text-gray-700 shrink-0">
                  小計 ¥{visit.subtotal.toLocaleString()}
                </span>
              </div>
              <ul className="space-y-1">
                {visit.records.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-600 truncate">
                      {r.kind === "payment" && (
                        <span className="mr-1.5 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold align-middle">
                          入金
                        </span>
                      )}
                      {r.workName}
                      <span className="ml-2 text-xs text-gray-400">{r.vehicleLabel}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-700">¥{r.price.toLocaleString()}</span>
                      {r.kind === "maintenance" && (
                        <Link
                          href={`/maintenance/${r.id}/receipt`}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="領収書を印刷"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          領収書
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
