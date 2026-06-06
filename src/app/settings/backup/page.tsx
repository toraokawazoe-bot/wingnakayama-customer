"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createBackupAction, listBackupsAction, type BackupFile } from "./actions";
import { ChevronLeft, Download, HardDrive } from "lucide-react";
import { toast } from "sonner";

export default function BackupPage() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [lastResult, setLastResult] = useState<{ filename: string; totalRows: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const reload = () => {
    startTransition(async () => {
      const list = await listBackupsAction();
      setFiles(list);
    });
  };

  useEffect(() => { reload(); }, []);

  const handleBackup = () => {
    startTransition(async () => {
      const result = await createBackupAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`バックアップ完了: ${result.filename}`);
      setLastResult({ filename: result.filename, totalRows: result.totalRows });
      const list = await listBackupsAction();
      setFiles(list);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />戻る
            </Button>
          </Link>
          <h1 className="text-lg font-semibold ml-2">バックアップ</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            今すぐバックアップ
          </h2>
          <p className="text-sm text-gray-500">
            全データ（顧客・車両・整備記録・商談・在庫など）を暗号化してクラウドストレージ
            （Vercel Blob）に保存します。<strong>毎日 深夜3時に自動でも実行されます。</strong>
          </p>

          <Button onClick={handleBackup} disabled={isPending} className="gap-2">
            <Download className="w-4 h-4" />
            {isPending ? "作成中..." : "バックアップを作成"}
          </Button>

          {lastResult && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✓ <strong>{lastResult.filename}</strong> を作成しました（{lastResult.totalRows}件）
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h2 className="text-base font-semibold">バックアップ一覧（直近30世代を自動保持）</h2>
          {files.length === 0 ? (
            <p className="text-sm text-gray-400">バックアップファイルはまだありません</p>
          ) : (
            <ul className="divide-y text-sm">
              {files.map((f) => (
                <li key={f.name} className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-gray-800">{f.name}</span>
                  <span className="text-gray-400 text-xs shrink-0">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-sm border p-5 text-sm text-gray-600 space-y-2">
          <h2 className="font-semibold text-gray-800">リストア方法（緊急時）</h2>
          <p>ターミナルから以下を実行してください:</p>
          <pre className="bg-gray-50 border rounded px-3 py-2 text-xs font-mono overflow-x-auto">{`vercel env pull                          # 復号キーを取得
vercel blob get backups/<ファイル名> --access private -o backups/<ファイル名>
npx tsx scripts/restore.ts backups/<ファイル名>`}</pre>
          <p className="text-xs text-gray-400">
            ※ 実行前に確認プロンプトが表示されます。.enc ファイルは自動で復号されます。
          </p>
        </section>
      </main>
    </div>
  );
}
