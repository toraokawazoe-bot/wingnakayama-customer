"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { visitorSearchAction } from "@/app/actions/visitor-search";
import {
  quickAddMaintenanceAction,
  undoMaintenanceAddAction,
} from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { CustomerSearchResult } from "@/lib/queries/customer-search";
import type { WorkItem } from "@/lib/queries/maintenance";
import { CustomerLightForm } from "@/components/customer-light-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Props = {
  workItems: WorkItem[];
};

export function VisitorBar({ workItems }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [showLightForm, setShowLightForm] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryParts = query.trim().split(/\s+/);
  const initialLastName = queryParts[0] ?? "";
  const initialFirstName = queryParts[1] ?? "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }
    setIsSearching(true);
    const result = await visitorSearchAction(q);
    setIsSearching(false);
    if (result.ok) {
      setResults(result.customers);
      setNoResults(result.customers.length === 0);
      setIsOpen(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 200);
  };

  const closeAndClear = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleNavigate = (customerId: number) => {
    closeAndClear();
    router.push(`/customers/${customerId}`);
  };

  const handleQuickAdd = (
    vehicleId: number,
    customerId: number,
    customerName: string,
    item: WorkItem
  ) => {
    const key = `${vehicleId}-${item.id}`;
    if (pendingKey) return;
    setPendingKey(key);
    startTransition(async () => {
      const result = await quickAddMaintenanceAction(vehicleId, customerId, item.id);
      setPendingKey(null);
      if (result.ok) {
        const recordId = result.recordId;
        // 誰に何を記録したか＋領収書／取り消しの導線をトーストに残す（押し間違い対策）
        toast.success(`${customerName}様「${item.name}」を記録しました`, {
          duration: 15000,
          description: `¥${item.defaultPrice.toLocaleString()}`,
          action: {
            label: "領収書を印刷",
            onClick: () => router.push(`/maintenance/${recordId}/receipt`),
          },
          cancel: {
            label: "取り消す",
            onClick: () => {
              startTransition(async () => {
                const undo = await undoMaintenanceAddAction(recordId, customerId, vehicleId);
                if (undo.ok) {
                  toast.success("取り消しました");
                } else {
                  toast.error(undo.error);
                }
              });
            },
          },
        });
        closeAndClear();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setIsOpen(true)}
          placeholder="お客さんの名前・電話・ナンバーで検索"
          className="pl-10 h-12 text-base bg-white border-2 focus:border-blue-500 transition-colors"
          autoComplete="off"
        />
        {isSearching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            検索中…
          </span>
        )}
      </div>

      {showLightForm && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1">
          <CustomerLightForm
            initialLastName={initialLastName}
            initialFirstName={initialFirstName}
            onClose={() => { setShowLightForm(false); setIsOpen(false); }}
          />
        </div>
      )}

      {isOpen && !showLightForm && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[32rem] overflow-y-auto">
          {noResults ? (
            <div className="p-3 space-y-2">
              <p className="text-sm text-gray-500">該当なし</p>
              <button
                onClick={() => { setIsOpen(false); setShowLightForm(true); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span>「{query.trim()}」さんを今すぐ登録（最低限のみ）</span>
              </button>
              <Link
                href="/customers/new"
                className="block text-xs text-gray-400 hover:underline text-center py-1"
              >
                詳細な情報も入力して登録する →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((c) => {
                const lastVisitDaysAgo = c.stats.lastVisitAt
                  ? Math.round((Date.now() - new Date(c.stats.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const lastVisitLabel = lastVisitDaysAgo === null ? null
                  : lastVisitDaysAgo < 7 ? `${lastVisitDaysAgo}日前`
                  : lastVisitDaysAgo < 30 ? `${Math.round(lastVisitDaysAgo / 7)}週間前`
                  : lastVisitDaysAgo < 365 ? `${Math.round(lastVisitDaysAgo / 30)}ヶ月前`
                  : `${Math.round(lastVisitDaysAgo / 365)}年前`;

                return (
                  <li key={c.id} className="p-3">
                    {/* 顧客名行 → カルテへ */}
                    <button
                      onClick={() => handleNavigate(c.id)}
                      className="w-full text-left flex items-center justify-between gap-2 hover:text-blue-700 group"
                    >
                      <div>
                        <span className="font-bold text-base text-gray-900 group-hover:text-blue-700">
                          {c.lastName} {c.firstName}
                        </span>
                        {(c.lastNameKana || c.firstNameKana) && (
                          <span className="ml-2 text-xs text-gray-400">
                            {c.lastNameKana} {c.firstNameKana}
                          </span>
                        )}
                        {c.phone && (
                          <span className="ml-2 text-xs text-gray-400">{c.phone}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right text-xs text-gray-400">
                          {lastVisitLabel && (
                            <div className={`font-medium ${lastVisitDaysAgo !== null && lastVisitDaysAgo >= 180 ? "text-amber-600" : "text-gray-500"}`}>
                              前回 {lastVisitLabel}
                            </div>
                          )}
                          {c.stats.totalAmount > 0 && (
                            <div>累計 ¥{c.stats.totalAmount.toLocaleString()}</div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />
                      </div>
                    </button>

                    {/* 車両ごとの作業クイック追加 */}
                    {c.vehicles.length > 0 && workItems.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {c.vehicles.map((v) => (
                          <div key={v.id} className="pl-1">
                            <p className="text-xs text-gray-400 mb-1">
                              {v.maker} {v.modelName}
                              {v.displacement ? ` ${v.displacement}cc` : ""}
                              {v.plateNumber ? ` / ${v.plateNumber}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {workItems.map((item) => {
                                const key = `${v.id}-${item.id}`;
                                return (
                                  <button
                                    key={item.id}
                                    disabled={!!pendingKey}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickAdd(v.id, c.id, `${c.lastName} ${c.firstName}`, item);
                                    }}
                                    className={`px-3 py-2 text-sm rounded-full border transition-colors
                                      ${pendingKey === key
                                        ? "bg-blue-100 border-blue-300 text-blue-600 opacity-60"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                                      } disabled:opacity-50`}
                                  >
                                    {item.name}
                                    <span className="ml-1 text-gray-400">¥{item.defaultPrice.toLocaleString()}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
