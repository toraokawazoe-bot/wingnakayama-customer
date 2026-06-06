import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const filepath = process.argv[2];
if (!filepath) {
  console.error("使用方法: npx tsx scripts/restore.ts backups/<ファイル名>.json[.enc]");
  process.exit(1);
}

if (!fs.existsSync(filepath)) {
  console.error(`ファイルが見つかりません: ${filepath}`);
  process.exit(1);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const ALGORITHM = "aes-256-gcm";

// バックアップファイル中のテーブル名はそのまま SQL に埋め込むため、
// 既知テーブルのみ許可（細工されたファイルによる任意 SQL 実行を防ぐ）。
const ALLOWED_TABLES = new Set([
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
]);

function decryptBackup(buf: Buffer, password: string): string {
  const salt = buf.subarray(0, 16);
  const iv = buf.subarray(16, 28);
  const authTag = buf.subarray(28, 44);
  const ciphertext = buf.subarray(44);
  const key = crypto.scryptSync(password, salt, 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf-8");
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

async function main() {
  // 暗号化ファイル判定: 拡張子 .enc
  const isEncrypted = filepath.endsWith(".enc");
  let raw: string;

  if (isEncrypted) {
    const password = process.env.BACKUP_ENCRYPTION_KEY;
    if (!password) {
      console.error(
        "❌ 暗号化ファイルですが BACKUP_ENCRYPTION_KEY が設定されていません。"
      );
      console.error("   .env.local に BACKUP_ENCRYPTION_KEY を設定してください。");
      client.close();
      process.exit(1);
    }
    const encrypted = fs.readFileSync(filepath);
    try {
      raw = decryptBackup(encrypted, password);
      console.log("🔓 復号化完了");
    } catch (e) {
      console.error("❌ 復号化に失敗しました:", (e as Error).message);
      console.error("   BACKUP_ENCRYPTION_KEY が正しいか確認してください。");
      client.close();
      process.exit(1);
    }
  } else {
    raw = fs.readFileSync(filepath, "utf-8");
  }

  const backup = JSON.parse(raw) as {
    version: number;
    createdAt: string;
    tables: Record<string, Record<string, unknown>[]>;
  };

  console.log(`\nバックアップファイル: ${filepath}`);
  console.log(`作成日時: ${backup.createdAt}`);
  console.log(`バージョン: ${backup.version}`);
  console.log("\nリストア対象テーブル:");
  for (const [table, rows] of Object.entries(backup.tables)) {
    console.log(`  ${table}: ${rows.length}件`);
  }

  console.log("\n⚠️  警告: 全テーブルのデータが削除され、バックアップの内容に置き換えられます。");
  console.log("    途中で失敗した場合は自動的にロールバックされます。");
  const ok = await confirm('実行するには "yes" と入力してください: ');
  if (!ok) {
    console.log("キャンセルしました。");
    client.close();
    return;
  }

  // ホワイトリスト検証: 未知のテーブル名が含まれていたら中断
  const unknownTables = Object.keys(backup.tables).filter((t) => !ALLOWED_TABLES.has(t));
  if (unknownTables.length > 0) {
    console.error(`❌ 不明なテーブル名が含まれています: ${unknownTables.join(", ")}`);
    console.error("   バックアップファイルが破損しているか、改ざんされている可能性があります。");
    client.close();
    process.exit(1);
  }

  const tables = Object.keys(backup.tables).reverse();

  // libSQL transaction でアトミックに実行
  const tx = await client.transaction("write");
  try {
    // DELETE
    for (const table of tables) {
      try {
        await tx.execute(`DELETE FROM \`${table}\``);
        console.log(`✓ ${table}: 削除完了`);
      } catch (e) {
        // テーブルが存在しないだけならスキップ可能
        const msg = (e as Error).message;
        if (msg.includes("no such table")) {
          console.warn(`⚠ ${table}: テーブル未存在（スキップ）`);
        } else {
          throw e;
        }
      }
    }

    // INSERT
    for (const [table, rows] of Object.entries(backup.tables)) {
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const badColumns = columns.filter((c) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c));
      if (badColumns.length > 0) {
        throw new Error(`不正なカラム名: ${table}.${badColumns.join(", ")}`);
      }
      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;

      let inserted = 0;
      for (const row of rows) {
        await tx.execute({
          sql,
          args: columns.map((c) => row[c] as string | number | null),
        });
        inserted++;
      }
      console.log(`✓ ${table}: ${inserted}件 挿入完了`);
    }

    await tx.commit();
    console.log("\n✅ リストア完了（コミット済み）");
  } catch (e) {
    await tx.rollback();
    console.error("\n❌ リストア失敗、ロールバックしました:", (e as Error).message);
    client.close();
    process.exit(1);
  }

  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
