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

const tables = [
  "bikes",
  "customers",
  "invoices",
  "invoice_items",
  "maintenance_records",
];

(async () => {
  console.log("=== DROP開始 ===");

  await client.execute("PRAGMA foreign_keys = OFF");
  console.log("PRAGMA foreign_keys = OFF");

  for (const table of tables) {
    await client.execute(`DROP TABLE IF EXISTS ${table}`);
    console.log(`DROP TABLE IF EXISTS ${table}`);
  }

  await client.execute("PRAGMA foreign_keys = ON");
  console.log("PRAGMA foreign_keys = ON");

  console.log("\n=== 削除後のテーブル一覧確認 ===");
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE 'libsql_%' ORDER BY name"
  );

  if (result.rows.length === 0) {
    console.log("（テーブルなし） ✓ 全テーブル削除完了");
  } else {
    console.log("残存テーブル:");
    result.rows.forEach((row) => console.log(" -", row.name));
  }

  client.close();
})();
