import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const filepath = process.argv[2];
if (!filepath) {
  console.error("使用方法: npx tsx scripts/restore.ts backups/<ファイル名>.json");
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
  const raw = fs.readFileSync(filepath, "utf-8");
  const backup = JSON.parse(raw) as {
    version: number;
    createdAt: string;
    tables: Record<string, Record<string, unknown>[]>;
  };

  console.log(`\nバックアップファイル: ${filepath}`);
  console.log(`作成日時: ${backup.createdAt}`);
  console.log("\nリストア対象テーブル:");
  for (const [table, rows] of Object.entries(backup.tables)) {
    console.log(`  ${table}: ${rows.length}件`);
  }

  console.log("\n⚠️  警告: 全テーブルのデータが削除され、バックアップの内容に置き換えられます。");
  const ok = await confirm('実行するには "yes" と入力してください: ');
  if (!ok) {
    console.log("キャンセルしました。");
    client.close();
    return;
  }

  const tables = Object.keys(backup.tables).reverse();

  // DELETE
  for (const table of tables) {
    try {
      await client.execute(`DELETE FROM ${table}`);
      console.log(`✓ ${table}: 削除完了`);
    } catch {
      console.warn(`⚠ ${table}: 削除スキップ`);
    }
  }

  // INSERT
  for (const [table, rows] of Object.entries(backup.tables)) {
    if (rows.length === 0) continue;
    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${table} (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of rows) {
      try {
        await client.execute({ sql, args: columns.map((c) => row[c] as string | number | null) });
        inserted++;
      } catch (e) {
        console.warn(`⚠ ${table} row insert失敗:`, (e as Error).message);
      }
    }
    console.log(`✓ ${table}: ${inserted}/${rows.length}件 挿入完了`);
  }

  console.log("\n✅ リストア完了");
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
