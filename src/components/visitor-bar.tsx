"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { visitorSearchAction } from "@/app/actions/visitor-search";
import type { CustomerSearchResult } from "@/lib/queries/customer-search";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function VisitorBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ESC to close
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

  const handleSelect = (customerId: number) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/customers/${customerId}`);
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

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {noResults ? (
            <div className="p-4 text-sm text-gray-500">
              該当なし。
              <Link href="/customers/new" className="ml-2 text-blue-600 hover:underline">
                新規登録しますか？
              </Link>
            </div>
          ) : (
            <ul>
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleSelect(c.id)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-base">
                          {c.lastName} {c.firstName}
                        </span>
                        {(c.lastNameKana || c.firstNameKana) && (
                          <span className="ml-2 text-xs text-gray-400">
                            {c.lastNameKana} {c.firstNameKana}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        {c.stats.totalAmount > 0 && (
                          <div>累計 ¥{c.stats.totalAmount.toLocaleString()}</div>
                        )}
                        {c.stats.lastVisitAt && (
                          <div>最終来店 {c.stats.lastVisitAt}</div>
                        )}
                      </div>
                    </div>
                    {c.vehicles.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.vehicles.map((v) => (
                          <span
                            key={v.id}
                            className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5"
                          >
                            {v.maker} {v.modelName} {v.displacement}cc
                            {v.plateNumber && ` / ${v.plateNumber}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
