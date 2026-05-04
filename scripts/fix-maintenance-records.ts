import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です");
  process.exit(1);
}

const client = createClient({ url, authToken });

(async () => {
  // 念のため現在の行数を再確認
  const cnt = await client.execute("SELECT COUNT(*) as cnt FROM maintenance_records");
  const rowCount = Number(cnt.rows[0].cnt);
  console.log(`maintenance_records 現在の行数: ${rowCount}`);

  if (rowCount > 0) {
    console.error("❌ データが存在するため自動修正を中止します。手動で対応してください。");
    client.close();
    process.exit(1);
  }

  console.log("行数ゼロを確認。旧テーブルを DROP して再作成します...");

  await client.execute("DROP TABLE IF EXISTS maintenance_records");
  console.log("✅ DROP TABLE maintenance_records");

  await client.execute(`
    CREATE TABLE maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      work_item_id INTEGER REFERENCES work_items(id),
      work_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      mileage INTEGER,
      performed_at TEXT NOT NULL,
      staff_id TEXT REFERENCES users(id),
      memo TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )
  `);
  console.log("✅ CREATE TABLE maintenance_records (新スキーマ)");

  // 検証
  const info = await client.execute("PRAGMA table_info(maintenance_records)");
  console.log("\n=== 再作成後のカラム構成 ===");
  info.rows.forEach((r) => {
    console.log(`  cid=${r.cid}  name=${r.name}  type=${r.type}  notnull=${r.notnull}  dflt=${r.dflt_value}`);
  });

  client.close();
  console.log("\n完了");
})();
