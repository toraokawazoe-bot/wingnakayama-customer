import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const tag = "0004_broken_black_tom";
  const sqlPath = path.join(process.cwd(), `src/db/migrations/${tag}.sql`);
  const content = fs.readFileSync(sqlPath).toString();
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const when = 1777874019038;

  // マイグレーション済みか確認
  const existing = await client.execute({
    sql: "SELECT hash FROM __drizzle_migrations WHERE hash = ?",
    args: [hash],
  });
  if (existing.rows.length > 0) {
    console.log("既にマイグレーション適用済みです。");
    client.close();
    return;
  }

  // 各テーブルの存在確認・作成
  const checks = [
    { table: "parts", sql: `CREATE TABLE IF NOT EXISTS \`parts\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`category\` text,
      \`sku\` text,
      \`supplier\` text,
      \`purchase_price\` integer,
      \`selling_price\` integer,
      \`current_stock\` integer DEFAULT 0 NOT NULL,
      \`min_stock\` integer DEFAULT 0 NOT NULL,
      \`unit\` text DEFAULT '個' NOT NULL,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`memo\` text,
      \`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
      \`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
    )` },
    { table: "stock_movements", sql: `CREATE TABLE IF NOT EXISTS \`stock_movements\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`part_id\` integer NOT NULL,
      \`movement_type\` text NOT NULL,
      \`quantity\` integer NOT NULL,
      \`maintenance_record_id\` integer,
      \`memo\` text,
      \`occurred_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (\`part_id\`) REFERENCES \`parts\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )` },
    { table: "work_item_parts", sql: `CREATE TABLE IF NOT EXISTS \`work_item_parts\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`work_item_id\` integer NOT NULL,
      \`part_id\` integer NOT NULL,
      \`quantity\` integer DEFAULT 1 NOT NULL,
      FOREIGN KEY (\`work_item_id\`) REFERENCES \`work_items\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`part_id\`) REFERENCES \`parts\`(\`id\`) ON UPDATE no action ON DELETE cascade
    )` },
  ];

  for (const { table, sql } of checks) {
    await client.execute(sql);
    console.log(`✅ ${table} テーブル確認/作成`);
  }

  // マイグレーション履歴に登録
  await client.execute({
    sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    args: [hash, when],
  });
  console.log(`✅ __drizzle_migrations に登録 (hash: ${hash.slice(0, 16)}...)`);

  // 確認
  for (const { table } of checks) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    console.log(`\n${table}: ${info.rows.length}カラム`);
    info.rows.forEach((r) => console.log(`  ${r.cid}: ${r.name} (${r.type})`));
  }

  client.close();
  console.log("\n完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
