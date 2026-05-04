"use client";

import { useState, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { partFormSchema, type PartFormInput, type PartFormData } from "@/lib/schemas/part";
import {
  createPartAction,
  updatePartAction,
  togglePartActiveAction,
  adjustStockAction,
} from "@/app/settings/parts/actions";
import { Plus, Pencil, Check, X, PackageCheck } from "lucide-react";

type Part = {
  id: number;
  name: string;
  category: string | null;
  sku: string | null;
  supplier: string | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  currentStock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  memo: string | null;
};

type Props = {
  initialParts: Part[];
  isOwner: boolean;
};

function PartForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  error,
}: {
  defaultValues: PartFormInput;
  onSubmit: (data: PartFormData) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<PartFormInput, unknown, PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues,
  });

  return (
    <tr className="bg-blue-50">
      <td className="px-3 py-2 min-w-[140px]">
        <Input {...register("name")} className="h-7 text-sm" placeholder="部品名 *" />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("category")} className="h-7 text-sm w-24" placeholder="カテゴリ" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("supplier")} className="h-7 text-sm w-24" placeholder="仕入先" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("purchasePrice")} type="number" min="0" className="h-7 text-sm w-20" placeholder="0" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("sellingPrice")} type="number" min="0" className="h-7 text-sm w-20" placeholder="0" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("currentStock")} type="number" min="0" className="h-7 text-sm w-16" />
        {errors.currentStock && <p className="text-xs text-red-500">{errors.currentStock.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("minStock")} type="number" min="0" className="h-7 text-sm w-16" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("unit")} className="h-7 text-sm w-12" />
      </td>
      <td className="px-3 py-2 text-center">—</td>
      <td className="px-3 py-2">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel} disabled={isPending}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function StockAdjustModal({
  part,
  onClose,
}: {
  part: Part;
  onClose: () => void;
}) {
  const [newStock, setNewStock] = useState(String(part.currentStock));
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const val = parseInt(newStock, 10);
    if (isNaN(val) || val < 0) { setError("0以上の整数で入力してください"); return; }
    startTransition(async () => {
      const result = await adjustStockAction(part.id, val, memo);
      if (result.ok) onClose();
      else setError(result.error);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-base mb-4">在庫調整: {part.name}</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">現在の在庫: <span className="font-mono font-bold">{part.currentStock} {part.unit}</span></p>
          </div>
          <div>
            <Label className="text-sm">新しい在庫数</Label>
            <Input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-sm">メモ（任意）</Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例: 棚卸し調整"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>キャンセル</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>調整する</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PartsManager({ initialParts, isOwner }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState<Part | null>(null);
  const [togglePending, setTogglePending] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [editPending, startEditTransition] = useTransition();
  const [addPending, startAddTransition] = useTransition();

  const categories = useMemo(
    () => Array.from(new Set(initialParts.map((p) => p.category).filter(Boolean) as string[])).sort(),
    [initialParts]
  );
  const suppliers = useMemo(
    () => Array.from(new Set(initialParts.map((p) => p.supplier).filter(Boolean) as string[])).sort(),
    [initialParts]
  );

  const filtered = useMemo(() => {
    return initialParts.filter((p) => {
      if (filterCategory && p.category !== filterCategory) return false;
      if (filterSupplier && p.supplier !== filterSupplier) return false;
      if (filterLowStock && p.currentStock > p.minStock) return false;
      return true;
    });
  }, [initialParts, filterCategory, filterSupplier, filterLowStock]);

  const lowStockCount = initialParts.filter((p) => p.isActive && p.currentStock <= p.minStock).length;

  const handleToggle = async (part: Part) => {
    if (!isOwner || togglePending !== null) return;
    setTogglePending(part.id);
    await togglePartActiveAction(part.id, !part.isActive);
    setTogglePending(null);
  };

  const handleEditSubmit = (id: number) => (data: PartFormData) => {
    startEditTransition(async () => {
      const result = await updatePartAction(id, data);
      if (result.ok) setEditingId(null);
      else setEditError(result.error);
    });
  };

  const handleAddSubmit = (data: PartFormData) => {
    startAddTransition(async () => {
      const result = await createPartAction(data);
      if (result.ok) setIsAdding(false);
      else setAddError(result.error);
    });
  };

  const emptyDefaults: PartFormInput = {
    name: "", category: "", sku: "", supplier: "",
    purchasePrice: "", sellingPrice: "",
    currentStock: 0, minStock: 0, unit: "個", isActive: true, memo: "",
  };

  const tableHeader = (
    <thead className="bg-gray-50 border-b text-xs">
      <tr>
        <th className="px-3 py-2 text-left font-medium text-gray-600">部品名</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">カテゴリ</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">仕入先</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">仕入価格</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">売値</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">在庫</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">最低在庫</th>
        <th className="px-3 py-2 text-left font-medium text-gray-600">単位</th>
        <th className="px-3 py-2 text-center font-medium text-gray-600">有効</th>
        {isOwner && <th className="px-3 py-2 font-medium text-gray-600">操作</th>}
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      {adjustingPart && (
        <StockAdjustModal part={adjustingPart} onClose={() => setAdjustingPart(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">部品マスタ管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">部品の在庫・価格を管理します</p>
        </div>
        {isOwner && !isAdding && (
          <Button size="sm" onClick={() => { setEditingId(null); setIsAdding(true); setAddError(null); }}>
            <Plus className="w-4 h-4 mr-1" /> 追加
          </Button>
        )}
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          編集はオーナーのみ可能です（在庫調整はスタッフも可能）
        </div>
      )}

      {/* フィルタ */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="text-sm border rounded-md px-2 py-1.5 bg-white"
        >
          <option value="">すべての仕入先</option>
          {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="rounded"
          />
          <span className="text-amber-700 font-medium">
            発注候補のみ
            {lowStockCount > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {lowStockCount}
              </span>
            )}
          </span>
        </label>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          {tableHeader}
          <tbody className="divide-y">
            {filtered.map((part) =>
              editingId === part.id ? (
                <PartForm
                  key={part.id}
                  defaultValues={{
                    name: part.name,
                    category: part.category ?? "",
                    sku: part.sku ?? "",
                    supplier: part.supplier ?? "",
                    purchasePrice: part.purchasePrice ?? "",
                    sellingPrice: part.sellingPrice ?? "",
                    currentStock: part.currentStock,
                    minStock: part.minStock,
                    unit: part.unit,
                    isActive: part.isActive,
                    memo: part.memo ?? "",
                  }}
                  onSubmit={handleEditSubmit(part.id)}
                  onCancel={() => { setEditingId(null); setEditError(null); }}
                  isPending={editPending}
                  error={editError}
                />
              ) : (
                <tr
                  key={part.id}
                  className={`hover:bg-gray-50 ${!part.isActive ? "opacity-50" : ""} ${
                    part.isActive && part.currentStock <= part.minStock ? "bg-amber-50/50" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium">
                    {part.name}
                    {part.sku && <span className="ml-1 text-xs text-gray-400">#{part.sku}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{part.category ?? "—"}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{part.supplier ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {part.purchasePrice != null ? `¥${part.purchasePrice.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {part.sellingPrice != null ? `¥${part.sellingPrice.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono text-sm font-medium ${
                      part.isActive && part.currentStock <= part.minStock
                        ? "text-amber-600"
                        : "text-gray-800"
                    }`}>
                      {part.currentStock}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{part.unit}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{part.minStock} {part.unit}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{part.unit}</td>
                  <td className="px-3 py-2.5 text-center">
                    {isOwner ? (
                      <button
                        onClick={() => handleToggle(part)}
                        disabled={togglePending === part.id}
                        className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                          part.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {part.isActive ? "有効" : "無効"}
                      </button>
                    ) : (
                      <span className={`text-xs ${part.isActive ? "text-green-600" : "text-gray-400"}`}>
                        {part.isActive ? "有効" : "無効"}
                      </span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="在庫調整"
                          onClick={() => setAdjustingPart(part)}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          title="編集"
                          onClick={() => { setIsAdding(false); setEditingId(part.id); setEditError(null); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            )}

            {filtered.length === 0 && !isAdding && (
              <tr>
                <td colSpan={isOwner ? 10 : 9} className="text-center py-8 text-sm text-gray-400">
                  該当する部品がありません
                </td>
              </tr>
            )}

            {isAdding && isOwner && (
              <PartForm
                defaultValues={emptyDefaults}
                onSubmit={handleAddSubmit}
                onCancel={() => { setIsAdding(false); setAddError(null); }}
                isPending={addPending}
                error={addError}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
