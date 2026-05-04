import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

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

async function main() {
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
  const filename = `${timestamp}.json`;
  const filepath = path.join(backupsDir, filename);

  const backup: Record<string, unknown> = {
    version: 1,
    createdAt: now.toISOString(),
    tables: {},
  };

  for (const table of TABLES) {
    try {
      const result = await client.execute(`SELECT * FROM ${table}`);
      const rows = result.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        result.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      (backup.tables as Record<string, unknown[]>)[table] = rows;
      console.log(`✓ ${table}: ${rows.length}件`);
    } catch {
      console.warn(`⚠ ${table}: スキップ（テーブルが存在しない可能性）`);
      (backup.tables as Record<string, unknown[]>)[table] = [];
    }
  }

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`\n✅ バックアップ完了: backups/${filename}`);

  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
