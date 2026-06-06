"use server";

import { auth } from "@/auth";
import { createAndUploadBackup, listStoredBackups } from "@/lib/backup";

export type BackupResult =
  | { ok: true; filename: string; totalRows: number; encrypted: boolean }
  | { ok: false; error: string };

// 手動バックアップ（Vercel Blob プライベートストアへ保存）。
// 毎日 3:00 JST に同じ処理が Cron（/api/cron/backup）でも自動実行される。
export async function createBackupAction(): Promise<BackupResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return { ok: false, error: "オーナーのみ実行できます" };

  try {
    const result = await createAndUploadBackup();
    return {
      ok: true,
      filename: result.pathname.replace(/^backups\//, ""),
      totalRows: result.totalRows,
      encrypted: result.encrypted,
    };
  } catch (error) {
    console.error("[createBackupAction] failed:", error);
    return { ok: false, error: "バックアップに失敗しました" };
  }
}

export type BackupFile = { name: string; size: number; createdAt: string };

export async function listBackupsAction(): Promise<BackupFile[]> {
  const session = await auth();
  if (!session?.user) return [];

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return [];

  try {
    const backups = await listStoredBackups();
    return backups.map((b) => ({
      name: b.pathname.replace(/^backups\//, ""),
      size: b.size,
      createdAt: b.uploadedAt,
    }));
  } catch (error) {
    console.error("[listBackupsAction] failed:", error);
    return [];
  }
}
