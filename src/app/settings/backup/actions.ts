"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const TABLES = [
  "shop_settings",
  "users",
  "customers",
  "vehicles",
  "insurances",
  "work_items",
  "maintenance_records",
  "parts",
  "work_item_parts",
  "stock_movements",
];

export type BackupResult =
  | { ok: true; filename: string; totalRows: number }
  | { ok: false; error: string };

export async function createBackupAction(): Promise<BackupResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "ログインが必要です" };

  const role = (session.user as { role?: string }).role;
  if (role !== "owner") return { ok: false, error: "オーナーのみ実行できます" };

  try {
    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
    const filename = `${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    const tables: Record<string, unknown[]> = {};
    let totalRows = 0;

    for (const table of TABLES) {
      try {
        const rows = await db.run(sql.raw(`SELECT * FROM ${table}`));
        const cols = rows.columns as string[];
        const rawRows = (rows.rows as unknown) as unknown[][];
        const mapped = rawRows.map((row) => {
          const obj: Record<string, unknown> = {};
          cols.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        });
        tables[table] = mapped;
        totalRows += mapped.length;
      } catch {
        tables[table] = [];
      }
    }

    const backup = { version: 1, createdAt: now.toISOString(), tables };
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");

    return { ok: true, filename, totalRows };
  } catch (error) {
    console.error("[createBackupAction] failed:", error);
    return { ok: false, error: "バックアップに失敗しました" };
  }
}

export type BackupFile = { name: string; size: number; createdAt: string };

export async function listBackupsAction(): Promise<BackupFile[]> {
  const session = await auth();
  if (!session?.user) return [];

  try {
    const backupsDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) return [];

    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.endsWith(".json"))
      .map((name) => {
        const stat = fs.statSync(path.join(backupsDir, name));
        return { name, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a, b) => b.name.localeCompare(a.name));

    return files;
  } catch {
    return [];
  }
}
