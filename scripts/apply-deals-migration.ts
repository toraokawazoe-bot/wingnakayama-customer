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
  const tag = "0006_deals";
  const sqlPath = path.join(process.cwd(), `src/db/migrations/${tag}.sql`);
  const content = fs.readFileSync(sqlPath).toString();
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const when = Date.now();

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

  // statement-breakpoint で分割して順次実行
  const statements = content
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await client.execute(stmt);
    const firstLine = stmt.split("\n")[0];
    console.log(`✅ 実行: ${firstLine}`);
  }

  // マイグレーション履歴に登録
  await client.execute({
    sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    args: [hash, when],
  });
  console.log(`✅ __drizzle_migrations に登録 (hash: ${hash.slice(0, 16)}...)`);

  // 確認
  for (const table of ["deals", "deal_payments"]) {
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
