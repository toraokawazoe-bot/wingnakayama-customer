import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
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
  // journal 読み込み
  const journalPath = path.join(process.cwd(), "src/db/migrations/meta/_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath).toString());

  // DB の最新 created_at 取得（migratorと同じクエリ）
  const result = await client.execute(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1"
  );
  const lastRow = result.rows[0];
  const lastCreatedAt = lastRow ? Number(lastRow[2]) : 0;

  console.log(`DB最終適用マイグレーション: created_at=${lastCreatedAt}`);
  console.log("");

  // 各マイグレーションのペンディング判定
  let pendingCount = 0;
  for (const entry of journal.entries) {
    const sqlPath = path.join(process.cwd(), `src/db/migrations/${entry.tag}.sql`);
    const content = fs.readFileSync(sqlPath).toString();
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const isPending = lastCreatedAt < entry.when;
    console.log(`${entry.tag}: when=${entry.when} hash=${hash.slice(0, 12)}... → ${isPending ? "⚠ PENDING" : "✓ applied"}`);
    if (isPending) pendingCount++;
  }

  console.log(`\n適用済み: ${journal.entries.length - pendingCount}/${journal.entries.length}`);
  if (pendingCount === 0) {
    console.log("✓ 全マイグレーション適用済み — drizzle-kit migrate は何もしない");
  } else {
    console.log(`⚠ ${pendingCount} 件のペンディングあり`);
  }

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
