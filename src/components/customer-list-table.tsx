"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CustomerWithVehicles } from "@/lib/queries/dashboard";
import type { CustomerStats } from "@/lib/queries/customer-stats";
import { ChevronUp, ChevronDown } from "lucide-react";

type Row = CustomerWithVehicles & { stats: CustomerStats };
type SortKey = "name" | "totalAmount" | "visitCount" | "lastVisitAt";

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <span className="inline-block w-3" />;
  return asc ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />;
}

export function CustomerListTable({ initialRows }: { initialRows: Row[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalAmount");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return initialRows;
    const q = query.toLowerCase();
    return initialRows.filter((r) =>
      `${r.lastName}${r.firstName}`.includes(q) ||
      `${r.lastNameKana ?? ""}${r.firstNameKana ?? ""}`.includes(q) ||
      (r.phone ?? "").includes(q) ||
      r.vehicles.some((v) => (v.plateNumber ?? "").toLowerCase().includes(q))
    );
  }, [query, initialRows]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, "ja");
          break;
        case "totalAmount":
          cmp = a.stats.totalAmount - b.stats.totalAmount;
          break;
        case "visitCount":
          cmp = a.stats.visitCount - b.stats.visitCount;
          break;
        case "lastVisitAt":
          cmp = (a.stats.lastVisitAt ?? "").localeCompare(b.stats.lastVisitAt ?? "");
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="名前・フリガナ・電話・ナンバーで絞り込み"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />
      <p className="text-sm text-gray-500">{sorted.length} 件</p>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => handleSort("name")}>
                  名前 <SortIcon active={sortKey === "name"} asc={sortAsc} />
                </Button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">電話番号</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">車両</th>
              <th className="px-4 py-3 text-right font-medium">
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => handleSort("totalAmount")}>
                  累計利用額 <SortIcon active={sortKey === "totalAmount"} asc={sortAsc} />
                </Button>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => handleSort("visitCount")}>
                  来店回数 <SortIcon active={sortKey === "visitCount"} asc={sortAsc} />
                </Button>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <Button variant="ghost" size="sm" className="h-auto p-0" onClick={() => handleSort("lastVisitAt")}>
                  最終来店 <SortIcon active={sortKey === "lastVisitAt"} asc={sortAsc} />
                </Button>
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.lastName} {r.firstName}</div>
                  {(r.lastNameKana || r.firstNameKana) && (
                    <div className="text-xs text-gray-400">{r.lastNameKana} {r.firstNameKana}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{r.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {r.vehicles.length === 0 ? (
                    <span className="text-gray-400 text-xs">なし</span>
                  ) : (
                    <div className="space-y-0.5">
                      {r.vehicles.slice(0, 2).map((v) => (
                        <div key={v.id} className="text-xs text-gray-600">
                          {v.maker} {v.modelName}
                          {v.plateNumber && <span className="ml-1 text-gray-400">{v.plateNumber}</span>}
                        </div>
                      ))}
                      {r.vehicles.length > 2 && (
                        <div className="text-xs text-gray-400">他{r.vehicles.length - 2}台</div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {r.stats.totalAmount > 0 ? `¥${r.stats.totalAmount.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.stats.visitCount > 0 ? `${r.stats.visitCount}回` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {r.stats.lastVisitAt ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/customers/${r.id}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    カルテ
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500">該当する顧客がいません</div>
        )}
      </div>
    </div>
  );
}
