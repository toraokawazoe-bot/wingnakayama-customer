import { db } from "@/db";
import { sql } from "drizzle-orm";
import { put, list, del } from "@vercel/blob";
import * as crypto from "crypto";

// バックアップ対象テーブル（scripts/restore.ts の ALLOWED_TABLES と揃えること）
export const BACKUP_TABLES = [
  "shop_settings",
  "users",
  "customers",
  "vehicles",
  "insurances",
  "inspection_dates",
  "vehicle_documents",
  "ownerships",
  "work_items",
  "maintenance_records",
  "parts",
  "work_item_parts",
  "stock_movements",
  "deals",
  "deal_payments",
];

// Blob 上の保存先プレフィックスと保持世代数
const BLOB_PREFIX = "backups/";
const KEEP_GENERATIONS = 30;

const ALGORITHM = "aes-256-gcm";

// AES-256-GCM 対称鍵暗号化。salt + iv + authTag + ciphertext を1ファイルに収める。
// scripts/backup.ts / scripts/restore.ts と同じフォーマット。
function encryptBackup(plaintext: string, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

async function buildBackupJson(): Promise<{ json: string; totalRows: number }> {
  const tables: Record<string, unknown[]> = {};
  let totalRows = 0;

  for (const table of BACKUP_TABLES) {
    try {
      const result = await db.run(sql.raw(`SELECT * FROM \`${table}\``));
      const cols = result.columns as string[];
      const rawRows = (result.rows as unknown) as unknown[][];
      const mapped = rawRows.map((row) => {
        const obj: Record<string, unknown> = {};
        cols.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      tables[table] = mapped;
      totalRows += mapped.length;
    } catch {
      // テーブル未存在はスキップ（マイグレーション差分を許容）
      tables[table] = [];
    }
  }

  const backup = {
    version: 2,
    createdAt: new Date().toISOString(),
    tables,
  };
  return { json: JSON.stringify(backup), totalRows };
}

export type BackupUploadResult = {
  pathname: string;
  totalRows: number;
  encrypted: boolean;
  size: number;
  prunedCount: number;
};

// 全テーブルを Vercel Blob（プライベートストア）へバックアップし、古い世代を削除する。
// BACKUP_ENCRYPTION_KEY があれば AES-256-GCM で暗号化（.json.enc）、なければ平文（.json）。
export async function createAndUploadBackup(): Promise<BackupUploadResult> {
  const { json, totalRows } = await buildBackupJson();

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .slice(0, 19);

  const password = process.env.BACKUP_ENCRYPTION_KEY;
  const encrypted = !!password;
  const body: Buffer | string = password ? encryptBackup(json, password) : json;
  const pathname = `${BLOB_PREFIX}${timestamp}.json${encrypted ? ".enc" : ""}`;

  const blob = await put(pathname, body, {
    access: "private",
    contentType: encrypted ? "application/octet-stream" : "application/json",
  });

  // 古い世代の削除（新しい順に KEEP_GENERATIONS 件残す）
  let prunedCount = 0;
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
    const sorted = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
    const toDelete = sorted.slice(KEEP_GENERATIONS);
    if (toDelete.length > 0) {
      await del(toDelete.map((b) => b.url));
      prunedCount = toDelete.length;
    }
  } catch (e) {
    // 削除失敗はバックアップ成功を妨げない
    console.error("[createAndUploadBackup] prune failed:", e);
  }

  return {
    pathname: blob.pathname,
    totalRows,
    encrypted,
    size: typeof body === "string" ? Buffer.byteLength(body) : body.length,
    prunedCount,
  };
}

export type StoredBackup = {
  pathname: string;
  size: number;
  uploadedAt: string;
};

// Blob 上のバックアップ一覧（新しい順）
export async function listStoredBackups(): Promise<StoredBackup[]> {
  const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  return blobs
    .sort((a, b) => b.pathname.localeCompare(a.pathname))
    .map((b) => ({
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt.toISOString(),
    }));
}
