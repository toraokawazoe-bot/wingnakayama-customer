"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { visitorSearchAction } from "@/app/actions/visitor-search";
import { batchAddMaintenanceAction } from "@/app/maintenance/batch/actions";
import type { CustomerSearchResult } from "@/lib/queries/customer-search";
import type { WorkItem } from "@/lib/queries/maintenance";
import { todayJst } from "@/lib/date";
import { Search, X, Trash2, Plus, ChevronRight } from "lucide-react";

type Vehicle = CustomerSearchResult["vehicles"][number];

type PendingItem = {
  key: string;
  customerId: number;
  customerName: string;
  vehicleId: number;
  vehicleLabel: string;
  workItemId: number | null;
  workName: string;
  price: number;
  mileage: number | null;
  memo: string | null;
  performedAt: string;
};

type Props = {
  workItems: WorkItem[];
};

export function BatchMaintenanceForm({ workItems }: Props) {
  const router = useRouter();
  const [performedAt, setPerformedAt] = useState(todayJst());
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Customer search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selected customer/vehicle
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Custom input
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setIsSearchOpen(false); return; }
    setIsSearching(true);
    const result = await visitorSearchAction(q);
    setIsSearching(false);
    if (result.ok) {
      setResults(result.customers);
      setIsSearchOpen(true);
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 200);
  };

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer);
    setIsSearchOpen(false);
    setQuery("");
    setResults([]);
    // 車両が1台なら自動選択
    if (customer.vehicles.length === 1) {
      setSelectedVehicle(customer.vehicles[0]);
    } else {
      setSelectedVehicle(null);
    }
  };

  const resetCustomerSelection = () => {
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setCustomName("");
    setCustomPrice("");
  };

  const vehicleLabel = (v: Vehicle) =>
    [v.maker, v.modelName, v.displacement ? `${v.displacement}cc` : null, v.plateNumber]
      .filter(Boolean)
      .join(" ");

  const addItem = (workItemId: number | null, workName: string, price: number) => {
    if (!selectedCustomer || !selectedVehicle) return;
    const item: PendingItem = {
      key: `${Date.now()}-${Math.random()}`,
      customerId: selectedCustomer.id,
      customerName: `${selectedCustomer.lastName} ${selectedCustomer.firstName}`,
      vehicleId: selectedVehicle.id,
      vehicleLabel: vehicleLabel(selectedVehicle),
      workItemId,
      workName,
      price,
      mileage: null,
      memo: null,
      performedAt,
    };
    setPendingItems((prev) => [...prev, item]);
    resetCustomerSelection();
  };

  const handleWorkItemClick = (item: WorkItem) => {
    addItem(item.id, item.name, item.defaultPrice);
  };

  const handleCustomAdd = () => {
    const price = parseInt(customPrice, 10);
    if (!customName.trim()) { alert("作業内容を入力してください"); return; }
    if (isNaN(price) || price < 0) { alert("金額を正しく入力してください"); return; }
    addItem(null, customName.trim(), price);
  };

  const removeItem = (key: string) => {
    setPendingItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateMileage = (key: string, val: string) => {
    const n = val === "" ? null : parseInt(val, 10);
    setPendingItems((prev) => prev.map((i) => i.key === key ? { ...i, mileage: isNaN(n as number) ? null : n } : i));
  };

  const handleSave = () => {
    if (pendingItems.length === 0) return;
    setSaveError(null);
    startSaving(async () => {
      const result = await batchAddMaintenanceAction(
        pendingItems.map((i) => ({
          vehicleId: i.vehicleId,
          workItemId: i.workItemId,
          workName: i.workName,
          price: i.price,
          mileage: i.mileage,
          memo: i.memo,
          performedAt: i.performedAt,
        }))
      );
      if (result.ok) {
        setSaveSuccess(true);
        setTimeout(() => router.push("/"), 1200);
      } else {
        setSaveError(result.error);
      }
    });
  };

  const categories = Array.from(new Set(workItems.map((w) => w.category ?? "その他")));
  const totalAmount = pendingItems.reduce((s, i) => s + i.price, 0);

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-lg text-green-800 font-medium text-center">
          {pendingItems.length}件保存しました。ホームへ移動します…
        </div>
      )}

      {/* 作業日 */}
      <section className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">作業日</label>
        <Input
          type="date"
          value={performedAt}
          onChange={(e) => setPerformedAt(e.target.value)}
          className="w-40"
        />
      </section>

      {/* 顧客・車両選択 */}
      <section className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">顧客・車両を選択</h2>

        {!selectedCustomer ? (
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                value={query}
                onChange={handleSearchChange}
                onFocus={() => query && setIsSearchOpen(true)}
                placeholder="名前・電話・ナンバーで検索"
                className="pl-9"
                autoComplete="off"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">検索中…</span>
              )}
            </div>
            {isSearchOpen && results.length > 0 && (
              <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{c.lastName} {c.firstName}</span>
                        {(c.lastNameKana || c.firstNameKana) && (
                          <span className="ml-2 text-xs text-gray-400">{c.lastNameKana} {c.firstNameKana}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{c.vehicles.length}台</span>
                    </div>
                    {c.vehicles.length > 0 && (
                      <div className="mt-0.5 text-xs text-gray-500">
                        {c.vehicles.map((v) => vehicleLabel(v)).join(" / ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2.5">
              <div>
                <span className="font-semibold text-blue-900">{selectedCustomer.lastName} {selectedCustomer.firstName}</span>
                {selectedCustomer.phone && (
                  <span className="ml-2 text-xs text-blue-600">{selectedCustomer.phone}</span>
                )}
              </div>
              <button onClick={resetCustomerSelection} className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 車両選択 */}
            {selectedCustomer.vehicles.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">車両未登録</p>
            )}
            {selectedCustomer.vehicles.length > 1 && !selectedVehicle && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">車両を選択:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className="text-sm px-3 py-1.5 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {vehicleLabel(v)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedVehicle && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{vehicleLabel(selectedVehicle)}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 作業選択 */}
      {selectedCustomer && selectedVehicle && (
        <section className="bg-white rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">作業を選択</h2>

          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</h3>
              <div className="flex flex-wrap gap-2">
                {workItems.filter((w) => (w.category ?? "その他") === cat).map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleWorkItemClick(item)}
                    className="text-sm"
                  >
                    {item.name}
                    <span className="ml-1.5 text-gray-400">¥{item.defaultPrice.toLocaleString()}</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}

          {/* カスタム入力 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">カスタム入力</h3>
            <div className="flex gap-2 flex-wrap items-start">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="作業内容"
                className="w-44"
                onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">¥</span>
                <Input
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-28 pl-7"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleCustomAdd} className="text-sm">
                <Plus className="w-3.5 h-3.5 mr-1" /> 追加
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 入力済みリスト */}
      {pendingItems.length > 0 && (
        <section className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">入力済み（{pendingItems.length}件）</h2>
            <span className="text-sm font-bold text-green-700">合計 ¥{totalAmount.toLocaleString()}</span>
          </div>
          <div className="divide-y">
            {pendingItems.map((item) => (
              <div key={item.key} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.customerName}</div>
                  <div className="text-xs text-gray-500 truncate">{item.vehicleLabel}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {item.workName}
                    <span className="ml-2 font-mono text-gray-700">¥{item.price.toLocaleString()}</span>
                    <span className="ml-2 text-gray-400">{item.performedAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="km"
                      className="w-24 text-xs h-7"
                      value={item.mileage ?? ""}
                      onChange={(e) => updateMileage(item.key, e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.key)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-4 border-t bg-gray-50">
            {saveError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {saveError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pendingItems.length}件 / 合計 <span className="font-bold text-gray-900">¥{totalAmount.toLocaleString()}</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className="px-6"
              >
                {isSaving ? "保存中…" : `すべて保存（${pendingItems.length}件）`}
              </Button>
            </div>
          </div>
        </section>
      )}

      {pendingItems.length === 0 && !selectedCustomer && (
        <div className="text-center py-12 text-sm text-gray-400">
          顧客を検索して作業を追加してください
        </div>
      )}
    </div>
  );
}
