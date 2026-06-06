"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  quickAddMaintenanceAction,
  customMaintenanceAddAction,
  undoMaintenanceAddAction,
} from "@/app/customers/[id]/vehicles/[vehicleId]/maintenance/actions";
import type { WorkItem } from "@/lib/queries/maintenance";
import { getCategoryIcon } from "@/lib/constants/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Undo2, Wrench } from "lucide-react";

const ALL = "すべて";

type AddedEntry = {
  recordId: number;
  name: string;
  price: number;
};

type Props = {
  vehicleId: number;
  customerId: number;
  workItems: WorkItem[];
  /** ダイアログ見出しに出す車両名（例: ホンダ ジョルノ） */
  vehicleName?: string;
};

export function MaintenancePickerDialog({ vehicleId, customerId, workItems, vehicleName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  // このダイアログを開いている間に追加した記録（その場で取り消せる）
  const [added, setAdded] = useState<AddedEntry[]>([]);

  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(workItems.map((w) => w.category ?? "その他")))],
    [workItems]
  );

  // 検索中は全カテゴリ横断、それ以外は選択カテゴリで絞り込み
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return workItems.filter((w) => w.name.toLowerCase().includes(q));
    if (category === ALL) return workItems;
    return workItems.filter((w) => (w.category ?? "その他") === category);
  }, [workItems, query, category]);

  // カテゴリ見出し付きでグループ化（登録順を維持）
  const groups = useMemo(() => {
    const m = new Map<string, WorkItem[]>();
    for (const w of filtered) {
      const c = w.category ?? "その他";
      const arr = m.get(c);
      if (arr) arr.push(w);
      else m.set(c, [w]);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const addedTotal = added.reduce((sum, a) => sum + a.price, 0);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setCategory(ALL);
      setAdded([]);
      setCustomName("");
      setCustomPrice("");
    }
  }

  function handleAdd(item: WorkItem) {
    if (isPending) return;
    setPendingId(item.id);
    startTransition(async () => {
      const result = await quickAddMaintenanceAction(vehicleId, customerId, item.id);
      setPendingId(null);
      if (result.ok) {
        setAdded((prev) => [...prev, { recordId: result.recordId, name: item.name, price: item.defaultPrice }]);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCustomAdd() {
    const price = parseInt(customPrice, 10);
    if (!customName.trim()) {
      toast.error("作業内容を入力してください");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("金額は0以上の整数で入力してください");
      return;
    }
    startTransition(async () => {
      const result = await customMaintenanceAddAction(vehicleId, customerId, customName, price);
      if (result.ok) {
        setAdded((prev) => [...prev, { recordId: result.recordId, name: customName.trim(), price }]);
        setCustomName("");
        setCustomPrice("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleUndo(entry: AddedEntry) {
    startTransition(async () => {
      const result = await undoMaintenanceAddAction(entry.recordId, customerId, vehicleId);
      if (result.ok) {
        setAdded((prev) => prev.filter((a) => a.recordId !== entry.recordId));
        toast.success(`「${entry.name}」を取り消しました`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Wrench className="w-4 h-4 mr-1" />
          整備を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 flex flex-col max-h-[88vh]" showCloseButton>
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0 space-y-3">
          <DialogTitle className="flex items-baseline gap-2">
            整備を追加
            {vehicleName && <span className="text-sm font-normal text-gray-500">{vehicleName}</span>}
          </DialogTitle>

          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="作業名で検索（例: オイル、パンク）"
              className="pl-9 h-10"
              autoFocus
            />
          </div>

          {/* カテゴリ切替（検索中は全カテゴリ横断なので非表示） */}
          {!query.trim() && (
            <div className="flex flex-wrap gap-1 pb-3">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === c
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        {/* 今回追加した分（その場で取り消し可能） */}
        {added.length > 0 && (
          <div className="shrink-0 px-4 py-2 bg-green-50 border-y border-green-100 text-sm">
            <div className="flex items-center justify-between font-semibold text-green-800">
              <span>今回追加 {added.length}件</span>
              <span>¥{addedTotal.toLocaleString()}</span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {added.map((a) => (
                <li key={a.recordId} className="flex items-center justify-between text-green-900/80">
                  <span className="truncate">{a.name}</span>
                  <span className="flex items-center gap-2 shrink-0 ml-2">
                    ¥{a.price.toLocaleString()}
                    <button
                      type="button"
                      onClick={() => handleUndo(a)}
                      disabled={isPending}
                      className="flex items-center gap-1 px-2 py-1.5 text-sm text-green-700 hover:text-red-600 underline underline-offset-2 rounded hover:bg-red-50"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      取り消す
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 作業リスト */}
        <div className="flex-1 overflow-y-auto px-2 py-2 border-t">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">該当する作業がありません</p>
          ) : (
            groups.map(([groupName, items]) => {
              const GroupIcon = getCategoryIcon(groupName);
              return (
                <div key={groupName} className="mb-1">
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-400">
                    <GroupIcon className="w-3.5 h-3.5" />
                    {groupName}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAdd(item)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-[15px] hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-50 ${
                        pendingId === item.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="flex items-center gap-2 shrink-0 font-semibold text-gray-700">
                        ¥{item.defaultPrice.toLocaleString()}
                        <Plus className="w-4 h-4 text-blue-500" />
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* 自由入力（リストにない作業はここから） */}
        <div className="shrink-0 border-t px-4 py-3 bg-gray-50">
          <div className="flex gap-2 items-center">
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="リストにない作業を入力"
              className="flex-1 h-9 text-sm bg-white"
              disabled={isPending}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">¥</span>
              <Input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
                className="w-28 h-9 pl-7 text-sm bg-white"
                disabled={isPending}
                onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
              />
            </div>
            <Button size="sm" className="h-9" onClick={handleCustomAdd} disabled={isPending}>
              <Plus className="w-4 h-4 mr-1" />
              追加
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            よく使う作業は「設定 → 作業マスタ」で登録するとリストに出ます
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
