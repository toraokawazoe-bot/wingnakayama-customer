import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const tag = "0005_add_tax_mode";
const sqlContent = `ALTER TABLE shop_settings ADD COLUMN tax_mode TEXT NOT NULL DEFAULT 'inclusive';
ALTER TABLE shop_settings ADD COLUMN tax_rate INTEGER NOT NULL DEFAULT 10;`;
const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
const when = Date.now();

async function main() {
  const existing = await client.execute({
    sql: "SELECT hash FROM __drizzle_migrations WHERE hash = ?",
    args: [hash],
  });
  if (existing.rows.length > 0) {
    console.log("既にマイグレーション適用済みです。");
    client.close();
    return;
  }

  // カラム存在確認
  const cols = await client.execute("PRAGMA table_info(shop_settings)");
  const colNames = cols.rows.map((r: any) => r.name as string);

  if (!colNames.includes("tax_mode")) {
    await client.execute("ALTER TABLE shop_settings ADD COLUMN tax_mode TEXT NOT NULL DEFAULT 'inclusive'");
    console.log("✓ tax_mode カラム追加");
  } else {
    console.log("tax_mode カラムは既に存在します");
  }

  if (!colNames.includes("tax_rate")) {
    await client.execute("ALTER TABLE shop_settings ADD COLUMN tax_rate INTEGER NOT NULL DEFAULT 10");
    console.log("✓ tax_rate カラム追加");
  } else {
    console.log("tax_rate カラムは既に存在します");
  }

  await client.execute({
    sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    args: [hash, when],
  });

  console.log(`✓ マイグレーション完了: ${tag}`);
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
