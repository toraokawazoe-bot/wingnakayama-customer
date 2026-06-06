import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

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

const ALGORITHM = "aes-256-gcm";

// AES-256-GCM 対称鍵暗号化。salt + iv + authTag + ciphertext を1ファイルに収める。
function encryptBackup(plaintext: string, password: string): Buffer {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

async function main() {
  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);

  const backup: Record<string, unknown> = {
    version: 2,
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

  const json = JSON.stringify(backup, null, 2);
  const password = process.env.BACKUP_ENCRYPTION_KEY;

  if (password) {
    // 暗号化保存
    const encrypted = encryptBackup(json, password);
    const filename = `${timestamp}.json.enc`;
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, encrypted);
    console.log(`\n🔒 暗号化バックアップ完了: backups/${filename}`);
  } else {
    // 平文保存（警告）
    console.warn(
      "\n⚠️  BACKUP_ENCRYPTION_KEY が未設定です。バックアップは平文で保存されます。"
    );
    console.warn(
      "   個人情報を含むため、本番運用では .env.local に BACKUP_ENCRYPTION_KEY を設定してください。"
    );
    const filename = `${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, json, "utf-8");
    console.log(`\n📄 平文バックアップ完了: backups/${filename}`);
  }

  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
