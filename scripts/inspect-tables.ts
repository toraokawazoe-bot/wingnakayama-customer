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

async function inspectTable(name: string) {
  console.log(`\n=== PRAGMA table_info(${name}) ===`);
  try {
    const info = await client.execute(`PRAGMA table_info(${name})`);
    if (info.rows.length === 0) {
      console.log("  ⚠️  テーブルが存在しません");
      return;
    }
    info.rows.forEach((r) => {
      console.log(`  cid=${r.cid}  name=${r.name}  type=${r.type}  notnull=${r.notnull}  dflt=${r.dflt_value}  pk=${r.pk}`);
    });

    // 行数確認
    const cnt = await client.execute(`SELECT COUNT(*) as cnt FROM ${name}`);
    console.log(`  → 行数: ${cnt.rows[0].cnt}`);
  } catch (e) {
    console.log("  ❌ エラー:", e);
  }
}

(async () => {
  await inspectTable("maintenance_records");
  await inspectTable("work_items");
  client.close();
})();
