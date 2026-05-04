"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { searchCustomersAction } from "@/app/actions/search";
import type { CustomerWithVehicles } from "@/lib/queries/dashboard";

type Props = {
  initialData: CustomerWithVehicles[];
};

export function CustomerSearch({ initialData }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialData);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchCustomersAction(query);
      if (result.ok) setResults(result.customers);
      setIsSearching(false);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="名前・電話番号・ナンバープレートで検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      {isSearching && (
        <p className="text-sm text-gray-500">検索中...</p>
      )}

      {!isSearching && results.length === 0 && (
        <p className="text-sm text-gray-500">該当する顧客が見つかりません。</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((customer) => (
          <Link
            key={customer.id}
            href={`/customers/${customer.id}`}
            className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition"
          >
            <div className="font-semibold text-gray-900">
              {customer.lastName} {customer.firstName}
            </div>
            {(customer.lastNameKana || customer.firstNameKana) && (
              <div className="text-sm text-gray-400">
                {customer.lastNameKana} {customer.firstNameKana}
              </div>
            )}
            {customer.phone && (
              <div className="text-sm text-gray-600 mt-1">{customer.phone}</div>
            )}
            {customer.vehicles.length > 0 && (
              <div className="mt-2 space-y-1">
                {customer.vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1"
                  >
                    {v.maker} {v.modelName} {v.displacement}cc
                    {v.plateNumber && ` / ${v.plateNumber}`}
                  </div>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
