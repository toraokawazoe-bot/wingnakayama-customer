"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workItemFormSchema, type WorkItemFormInput, type WorkItemFormData } from "@/lib/schemas/work-item";
import {
  createWorkItemAction,
  updateWorkItemAction,
  toggleWorkItemActiveAction,
  attachPartToWorkItemAction,
  detachPartFromWorkItemAction,
  updateWorkItemPartQuantityAction,
} from "@/app/settings/work-items/actions";
import { Plus, Pencil, Check, X, Package, Trash2 } from "lucide-react";

type WorkItem = {
  id: number;
  name: string;
  category: string | null;
  defaultPrice: number;
  displayOrder: number;
  isActive: boolean;
};

type PartOption = {
  id: number;
  name: string;
  category: string | null;
  unit: string;
};

type WorkItemPart = {
  id: number;
  partId: number;
  partName: string;
  partUnit: string;
  quantity: number;
};

type Props = {
  initialItems: WorkItem[];
  isOwner: boolean;
  allParts: PartOption[];
};

function EditRow({ item, onDone }: { item: WorkItem; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<WorkItemFormInput, unknown, WorkItemFormData>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      name: item.name,
      category: item.category ?? "",
      defaultPrice: item.defaultPrice,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    },
  });

  const onSubmit = (data: WorkItemFormData) => {
    startTransition(async () => {
      const result = await updateWorkItemAction(item.id, data);
      if (result.ok) onDone();
      else setError(result.error);
    });
  };

  return (
    <tr className="bg-blue-50">
      <td className="px-3 py-2">
        <Input {...register("name")} className="h-8 text-sm" />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("category")} className="h-8 text-sm" placeholder="カテゴリ" list="work-item-categories" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("defaultPrice")} type="number" min="0" className="h-8 text-sm w-28" />
        {errors.defaultPrice && <p className="text-xs text-red-500 mt-0.5">{errors.defaultPrice.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("displayOrder")} type="number" min="0" className="h-8 text-sm w-20" />
      </td>
      <td className="px-3 py-2 text-center">—</td>
      <td className="px-3 py-2">—</td>
      <td className="px-3 py-2">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDone} disabled={isPending}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddRow({ onDone }: { onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WorkItemFormInput, unknown, WorkItemFormData>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: { name: "", category: "", defaultPrice: 0, displayOrder: 0, isActive: true },
  });

  const onSubmit = (data: WorkItemFormData) => {
    startTransition(async () => {
      const result = await createWorkItemAction(data);
      if (result.ok) { reset(); onDone(); }
      else setError(result.error);
    });
  };

  return (
    <tr className="bg-green-50">
      <td className="px-3 py-2">
        <Input {...register("name")} className="h-8 text-sm" placeholder="作業名 *" />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("category")} className="h-8 text-sm" placeholder="カテゴリ" list="work-item-categories" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("defaultPrice")} type="number" min="0" className="h-8 text-sm w-28" placeholder="0" />
        {errors.defaultPrice && <p className="text-xs text-red-500 mt-0.5">{errors.defaultPrice.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("displayOrder")} type="number" min="0" className="h-8 text-sm w-20" placeholder="0" />
      </td>
      <td className="px-3 py-2 text-center">—</td>
      <td className="px-3 py-2">—</td>
      <td className="px-3 py-2">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-1">
          <Button size="sm" className="h-7 px-2" onClick={handleSubmit(onSubmit)} disabled={isPending}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDone} disabled={isPending}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function WorkItemPartsModal({
  workItem,
  allParts,
  onClose,
}: {
  workItem: WorkItem;
  allParts: PartOption[];
  onClose: () => void;
}) {
  const [linkedParts, setLinkedParts] = useState<WorkItemPart[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);

  // クライアントサイドでのフェッチの代わりにサーバーアクションを使用
  // 初回マウント時にgetPartsForWorkItemを呼ぶ代わりに、
  // このモーダルはpropsで渡されたallPartsを元に動作し、
  // 実際の紐付けはserver actionで管理する。
  // ページリフレッシュ後に最新状態を反映するためonCloseでrevalidateされる。

  const handleAttach = () => {
    const partId = parseInt(selectedPartId, 10);
    const qty = parseInt(quantity, 10);
    if (isNaN(partId)) { setError("部品を選択してください"); return; }
    if (isNaN(qty) || qty < 1) { setError("数量は1以上で入力してください"); return; }

    startTransition(async () => {
      const result = await attachPartToWorkItemAction(workItem.id, partId, qty);
      if (result.ok) {
        const part = allParts.find((p) => p.id === partId);
        if (part) {
          setLinkedParts((prev) => [...prev, {
            id: Date.now(), // 仮ID（ページリフレッシュで更新）
            partId,
            partName: part.name,
            partUnit: part.unit,
            quantity: qty,
          }]);
        }
        setSelectedPartId("");
        setQuantity("1");
        setError(null);
      } else {
        setError(result.error);
      }
    });
  };

  const handleDetach = (wipId: number) => {
    startTransition(async () => {
      const result = await detachPartFromWorkItemAction(wipId);
      if (result.ok) {
        setLinkedParts((prev) => prev.filter((p) => p.id !== wipId));
      }
    });
  };

  const handleQtyChange = (wipId: number, newQty: number) => {
    startTransition(async () => {
      const result = await updateWorkItemPartQuantityAction(wipId, newQty);
      if (result.ok) {
        setLinkedParts((prev) => prev.map((p) => p.id === wipId ? { ...p, quantity: newQty } : p));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">使用部品: {workItem.name}</h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          この作業を実行した際に自動的に在庫から引き落とされる部品を設定します。
        </p>

        {/* 既存紐付けリスト */}
        {linkedParts.length > 0 && (
          <div className="mb-4 space-y-1">
            {linkedParts.map((wp) => (
              <div key={wp.id} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                <span className="flex-1 text-sm">{wp.partName}</span>
                <input
                  type="number"
                  min="1"
                  value={wp.quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) handleQtyChange(wp.id, v);
                  }}
                  className="w-16 text-sm border rounded px-2 py-0.5 text-center"
                  disabled={isPending}
                />
                <span className="text-xs text-gray-400">{wp.partUnit}</span>
                <button
                  onClick={() => handleDetach(wp.id)}
                  disabled={isPending}
                  className="text-red-400 hover:text-red-600 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {linkedParts.length === 0 && !loaded && (
          <p className="text-sm text-gray-400 mb-4 text-center py-3">
            紐付け済みの部品はありません（ページ保存後に反映されます）
          </p>
        )}

        {/* 新規追加 */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">部品を追加</p>
          <div className="flex gap-2 items-start flex-wrap">
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="flex-1 min-w-[140px] text-sm border rounded-md px-2 py-1.5 bg-white"
              disabled={isPending}
            >
              <option value="">部品を選択...</option>
              {allParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.category ? ` (${p.category})` : ""}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 text-sm"
              disabled={isPending}
            />
            <Button size="sm" onClick={handleAttach} disabled={isPending}>
              <Plus className="w-3.5 h-3.5 mr-1" /> 追加
            </Button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}

export function WorkItemsManager({ initialItems, isOwner, allParts }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [partsModalItem, setPartsModalItem] = useState<WorkItem | null>(null);
  const [togglePending, setTogglePending] = useState<number | null>(null);

  const handleToggle = async (item: WorkItem) => {
    if (!isOwner || togglePending !== null) return;
    setTogglePending(item.id);
    await toggleWorkItemActiveAction(item.id, !item.isActive);
    setTogglePending(null);
  };

  const categories = Array.from(new Set(initialItems.map((w) => w.category ?? "その他")));

  return (
    <div className="space-y-6">
      {/* カテゴリ入力の候補（選択も自由入力も可） */}
      <datalist id="work-item-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {partsModalItem && (
        <WorkItemPartsModal
          workItem={partsModalItem}
          allParts={allParts}
          onClose={() => setPartsModalItem(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">作業マスタ管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">クイック追加ボタンに表示する作業項目を管理します</p>
        </div>
        {isOwner && !isAdding && (
          <Button size="sm" onClick={() => { setEditingId(null); setIsAdding(true); }}>
            <Plus className="w-4 h-4 mr-1" /> 追加
          </Button>
        )}
      </div>

      {!isOwner && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          編集はオーナーのみ可能です
        </div>
      )}

      {categories.map((category) => {
        const catItems = initialItems.filter((w) => (w.category ?? "その他") === category);
        return (
          <div key={category}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              {category}
            </h2>
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">作業名</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">カテゴリ</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">定価</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">順序</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">有効</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">使用部品</th>
                    {isOwner && <th className="px-3 py-2 font-medium text-gray-600">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {catItems.map((item) =>
                    editingId === item.id ? (
                      <EditRow key={item.id} item={item} onDone={() => setEditingId(null)} />
                    ) : (
                      <tr key={item.id} className={`hover:bg-gray-50 ${!item.isActive ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2.5 font-medium">{item.name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{item.category ?? "—"}</td>
                        <td className="px-3 py-2.5 font-mono">¥{item.defaultPrice.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.displayOrder}</td>
                        <td className="px-3 py-2.5 text-center">
                          {isOwner ? (
                            <button
                              onClick={() => handleToggle(item)}
                              disabled={togglePending === item.id}
                              className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                                item.isActive
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                            >
                              {item.isActive ? "有効" : "無効"}
                            </button>
                          ) : (
                            <span className={`text-xs ${item.isActive ? "text-green-600" : "text-gray-400"}`}>
                              {item.isActive ? "有効" : "無効"}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-blue-600"
                            onClick={() => setPartsModalItem(item)}
                          >
                            <Package className="w-3.5 h-3.5 mr-1" /> 設定
                          </Button>
                        </td>
                        {isOwner && (
                          <td className="px-3 py-2.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => { setIsAdding(false); setEditingId(item.id); }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {isAdding && isOwner && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">新規追加</h2>
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">作業名</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">カテゴリ</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">定価</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">順序</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">有効</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">使用部品</th>
                  <th className="px-3 py-2 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                <AddRow onDone={() => setIsAdding(false)} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
