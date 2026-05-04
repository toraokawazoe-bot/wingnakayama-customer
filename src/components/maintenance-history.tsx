import Link from "next/link";
import type { MaintenanceRecord } from "@/lib/queries/maintenance";

type Props = {
  records: MaintenanceRecord[];
};

export function MaintenanceHistory({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        整備記録はまだありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">作業日</th>
            <th className="pb-2 pr-4 font-medium">作業内容</th>
            <th className="pb-2 pr-4 font-medium text-right">金額</th>
            <th className="pb-2 pr-4 font-medium">担当</th>
            <th className="pb-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{r.performedAt}</td>
              <td className="py-3 pr-4 font-medium">
                {r.workName}
                {r.memo && (
                  <div className="text-xs text-gray-400 mt-0.5">{r.memo}</div>
                )}
              </td>
              <td className="py-3 pr-4 text-right">
                ¥{r.price.toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-gray-600">{r.staffName ?? "—"}</td>
              <td className="py-3">
                <Link
                  href={`/maintenance/${r.id}/receipt`}
                  className="text-blue-600 hover:underline text-xs"
                >
                  領収書
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
