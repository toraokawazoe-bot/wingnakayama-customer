"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { workItemFormSchema, type WorkItemFormInput, type WorkItemFormData } from "@/lib/schemas/work-item";
import {
  createWorkItemAction,
  updateWorkItemAction,
  toggleWorkItemActiveAction,
} from "@/app/settings/work-items/actions";
import { Plus, Pencil, Check, X } from "lucide-react";

type WorkItem = {
  id: number;
  name: string;
  category: string | null;
  defaultPrice: number;
  displayOrder: number;
  isActive: boolean;
};

type Props = {
  initialItems: WorkItem[];
  isOwner: boolean;
};

function EditRow({
  item,
  onDone,
}: {
  item: WorkItem;
  onDone: () => void;
}) {
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
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <tr className="bg-blue-50">
      <td className="px-3 py-2">
        <Input {...register("name")} className="h-8 text-sm" />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("category")} className="h-8 text-sm" placeholder="カテゴリ" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("defaultPrice")} type="number" min="0" className="h-8 text-sm w-28" />
        {errors.defaultPrice && <p className="text-xs text-red-500 mt-0.5">{errors.defaultPrice.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("displayOrder")} type="number" min="0" className="h-8 text-sm w-20" />
      </td>
      <td className="px-3 py-2 text-center">—</td>
      <td className="px-3 py-2">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-1">
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={onDone}
            disabled={isPending}
          >
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
      if (result.ok) {
        reset();
        onDone();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <tr className="bg-green-50">
      <td className="px-3 py-2">
        <Input {...register("name")} className="h-8 text-sm" placeholder="作業名 *" />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("category")} className="h-8 text-sm" placeholder="カテゴリ" />
      </td>
      <td className="px-3 py-2">
        <Input {...register("defaultPrice")} type="number" min="0" className="h-8 text-sm w-28" placeholder="0" />
        {errors.defaultPrice && <p className="text-xs text-red-500 mt-0.5">{errors.defaultPrice.message}</p>}
      </td>
      <td className="px-3 py-2">
        <Input {...register("displayOrder")} type="number" min="0" className="h-8 text-sm w-20" placeholder="0" />
      </td>
      <td className="px-3 py-2 text-center">—</td>
      <td className="px-3 py-2">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-1">
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
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

export function WorkItemsManager({ initialItems, isOwner }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
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
