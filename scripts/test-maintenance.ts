import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const workItemsResult = await client.execute(
    "SELECT id, name, category, default_price, display_order FROM work_items ORDER BY display_order"
  );
  console.log(`=== work_items: ${workItemsResult.rows.length} 件 ===`);
  console.table(workItemsResult.rows);

  const recordsResult = await client.execute(
    "SELECT COUNT(*) as count FROM maintenance_records"
  );
  const recordCount = recordsResult.rows[0][0];
  console.log(`=== maintenance_records: ${recordCount} 件 ===`);

  // 整合性チェック
  console.log("\n=== 整合性チェック ===");
  if (workItemsResult.rows.length === 11) {
    console.log("✓ work_items: 11件（期待通り）");
  } else {
    console.log(`⚠ work_items: ${workItemsResult.rows.length}件（期待: 11件）`);
  }

  const categories = new Set(workItemsResult.rows.map((r) => r[2]));
  console.log(`✓ カテゴリ数: ${categories.size}件 (${Array.from(categories).join(", ")})`);

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
