import Link from "next/link";
import { getMonthlySummary } from "@/lib/queries/monthly-stats";
import { getLowStockParts } from "@/lib/queries/parts";

export async function SidebarStats() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [summary, lowStock] = await Promise.all([
    getMonthlySummary(year, month),
    getLowStockParts(),
  ]);

  const monthLabel = `${year}年${month}月`;

  return (
    <aside className="space-y-4">
      {/* 今月サマリ */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-sm font-semibold text-gray-700">今月の状況（{monthLabel}）</h2>
        </div>
        <div className="px-4 py-3 space-y-3">
          {/* カテゴリ別件数 */}
          {summary.byCategory.length > 0 ? (
            <div className="space-y-1.5">
              {summary.byCategory.map(({ category, count }) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{category}</span>
                  <span className="font-medium tabular-nums">{count}件</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">今月の作業記録なし</p>
          )}

          <div className="border-t pt-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">総作業件数</span>
              <span className="font-bold tabular-nums">{summary.totalCount}件</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">売上合計</span>
              <span className="font-bold tabular-nums text-green-700">
                ¥{summary.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 発注候補 */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          lowStock.length > 0 ? "bg-amber-50" : "bg-gray-50"
        }`}>
          <h2 className="text-sm font-semibold text-gray-700">⚠️ 発注候補</h2>
          {lowStock.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {lowStock.length}件
            </span>
          )}
        </div>
        <div className="px-4 py-3">
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">発注候補なし</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {lowStock.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate max-w-[140px]">{p.name}</span>
                    <span className="text-xs tabular-nums text-amber-600 font-medium ml-2 shrink-0">
                      {p.currentStock} / {p.minStock}{p.unit}
                    </span>
                  </div>
                ))}
              </div>
              {lowStock.length > 5 && (
                <p className="text-xs text-gray-400 mt-2 text-center">他{lowStock.length - 5}件</p>
              )}
              <div className="mt-3 border-t pt-2">
                <Link
                  href="/settings/parts?filter=low-stock"
                  className="text-xs text-blue-600 hover:underline"
                >
                  すべて見る →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
