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
  const sqlPath = path.join(process.cwd(), "src/db/migrations/0003_fancy_spot.sql");
  const content = fs.readFileSync(sqlPath).toString();
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const journalPath = path.join(process.cwd(), "src/db/migrations/meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath).toString());
  const entry = journal.entries.find((e: { tag: string }) => e.tag === "0003_fancy_spot");

  // テーブルが既に存在するか確認
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='shop_settings'"
  );

  if (tables.rows.length > 0) {
    console.log("shop_settings テーブルは既に存在します。");
  } else {
    await client.execute(content);
    console.log("shop_settings テーブルを作成しました。");
  }

  // マイグレーション履歴に追加（未登録なら）
  const existing = await client.execute({
    sql: "SELECT hash FROM __drizzle_migrations WHERE hash = ?",
    args: [hash],
  });

  if (existing.rows.length === 0) {
    await client.execute({
      sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      args: [hash, entry.when],
    });
    console.log("マイグレーション履歴に登録しました。");
  } else {
    console.log("マイグレーション履歴は既に登録されています。");
  }

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
