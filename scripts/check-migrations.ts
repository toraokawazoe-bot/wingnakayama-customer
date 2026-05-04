import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // __drizzle_migrations の全行
  const migrationsResult = await client.execute(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at"
  );
  console.log("=== __drizzle_migrations ===");
  console.table(migrationsResult.rows);

  // 全テーブル一覧
  const tablesResult = await client.execute(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name"
  );
  console.log("\n=== sqlite_master (tables/views) ===");
  console.table(tablesResult.rows);

  // src/db/migrations/ の .sql ファイル一覧
  const migrationsDir = path.join(process.cwd(), "src/db/migrations");
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log("\n=== src/db/migrations/*.sql ===");
  sqlFiles.forEach((f) => console.log(" ", f));

  // 整合性チェック
  console.log(`\n=== 整合性 ===`);
  console.log(`SQLファイル数: ${sqlFiles.length}`);
  console.log(`__drizzle_migrations 行数: ${migrationsResult.rows.length}`);
  if (sqlFiles.length !== migrationsResult.rows.length) {
    console.log("⚠ 不整合あり");
  } else {
    console.log("✓ 一致");
  }

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
