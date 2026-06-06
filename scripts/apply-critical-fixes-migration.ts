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
  const tag = "0005_critical_fixes";
  const sqlPath = path.join(process.cwd(), `src/db/migrations/${tag}.sql`);
  const content = fs.readFileSync(sqlPath).toString();
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const when = Date.now();

  // 既に適用済みか確認
  const existing = await client.execute({
    sql: "SELECT hash FROM __drizzle_migrations WHERE hash = ?",
    args: [hash],
  });
  if (existing.rows.length > 0) {
    console.log("既にマイグレーション適用済みです。");
    client.close();
    return;
  }

  // ──────────────────────────────────────────
  // 事前チェック: ownerships の重複現所有者を検出
  // ──────────────────────────────────────────
  const dupes = await client.execute(`
    SELECT vehicle_id, COUNT(*) as cnt
    FROM ownerships
    WHERE end_date IS NULL
    GROUP BY vehicle_id
    HAVING cnt > 1
  `);
  if (dupes.rows.length > 0) {
    console.error("⚠️  重複した現所有者が存在します。先にデータを修正してください:");
    dupes.rows.forEach((r) =>
      console.error(`  vehicle_id=${r.vehicle_id} に ${r.cnt} 件の end_date IS NULL`)
    );
    console.error("修正方法: 古い ownership の end_date を入れる、または不要なレコードを削除");
    client.close();
    process.exit(1);
  }
  console.log("✅ ownerships 整合性チェック OK");

  // ──────────────────────────────────────────
  // C3, C5: stock_movements 再構築
  // ──────────────────────────────────────────
  // SQLite では ALTER TABLE で FK 追加不可のため、テーブル再構築
  console.log("📦 stock_movements を再構築して FK を追加...");

  // FK チェック一時OFF（再構築中の整合性違反回避）
  await client.execute("PRAGMA foreign_keys = OFF");

  await client.execute(`
    CREATE TABLE \`stock_movements_new\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`part_id\` integer NOT NULL,
      \`movement_type\` text NOT NULL,
      \`quantity\` integer NOT NULL,
      \`maintenance_record_id\` integer,
      \`memo\` text,
      \`occurred_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (\`part_id\`) REFERENCES \`parts\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`maintenance_record_id\`) REFERENCES \`maintenance_records\`(\`id\`) ON UPDATE no action ON DELETE set null
    )
  `);

  await client.execute(`
    INSERT INTO \`stock_movements_new\` (id, part_id, movement_type, quantity, maintenance_record_id, memo, occurred_at)
    SELECT id, part_id, movement_type, quantity, maintenance_record_id, memo, occurred_at FROM \`stock_movements\`
  `);

  // 移行件数を確認
  const oldCount = await client.execute("SELECT COUNT(*) as cnt FROM stock_movements");
  const newCount = await client.execute("SELECT COUNT(*) as cnt FROM stock_movements_new");
  if (oldCount.rows[0].cnt !== newCount.rows[0].cnt) {
    await client.execute("DROP TABLE stock_movements_new");
    await client.execute("PRAGMA foreign_keys = ON");
    console.error(
      `❌ 行数不一致: old=${oldCount.rows[0].cnt}, new=${newCount.rows[0].cnt} — ロールバック`
    );
    client.close();
    process.exit(1);
  }

  await client.execute("DROP TABLE `stock_movements`");
  await client.execute("ALTER TABLE `stock_movements_new` RENAME TO `stock_movements`");
  await client.execute("PRAGMA foreign_keys = ON");
  console.log(`✅ stock_movements 再構築完了 (${newCount.rows[0].cnt} 行)`);

  // ──────────────────────────────────────────
  // C6: ownerships の現所有者ユニーク制約
  // ──────────────────────────────────────────
  await client.execute(`
    CREATE UNIQUE INDEX \`ownerships_vehicle_current_unique\`
    ON \`ownerships\` (\`vehicle_id\`)
    WHERE \`end_date\` IS NULL
  `);
  console.log("✅ ownerships_vehicle_current_unique インデックス作成");

  // ──────────────────────────────────────────
  // マイグレーション履歴登録
  // ──────────────────────────────────────────
  await client.execute({
    sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    args: [hash, when],
  });
  console.log(`✅ __drizzle_migrations に登録 (hash: ${hash.slice(0, 16)}...)`);

  // ──────────────────────────────────────────
  // 確認
  // ──────────────────────────────────────────
  const fkInfo = await client.execute("PRAGMA foreign_key_list(stock_movements)");
  console.log("\nstock_movements の外部キー:");
  fkInfo.rows.forEach((r) =>
    console.log(`  ${r.from} -> ${r.table}.${r.to} (ON DELETE ${r.on_delete})`)
  );

  const idxInfo = await client.execute("PRAGMA index_list(ownerships)");
  console.log("\nownerships のインデックス:");
  idxInfo.rows.forEach((r) => console.log(`  ${r.name} (unique=${r.unique})`));

  client.close();
  console.log("\n🎉 完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
