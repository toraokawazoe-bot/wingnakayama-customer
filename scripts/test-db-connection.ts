import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

(async () => {
  const { db, customers } = await import("../src/db/index");
  const { eq } = await import("drizzle-orm");
  console.log("=== DB接続テスト開始 ===\n");

  // 1. INSERT
  console.log("1. テストデータをINSERT...");
  const inserted = await db.insert(customers).values({
    lastName: "テスト",
    firstName: "太郎",
  }).returning();
  console.log("   INSERT完了:", inserted[0]);

  const insertedId = inserted[0].id;

  // 2. 全件SELECT
  console.log("\n2. customers テーブルを全件SELECT...");
  const allRows = await db.select().from(customers);
  console.log(`   取得件数: ${allRows.length}件`);
  allRows.forEach((row) => console.log("  ", row));

  // 3. DELETE
  console.log(`\n3. id=${insertedId} のレコードをDELETE...`);
  await db.delete(customers).where(eq(customers.id, insertedId));
  console.log("   DELETE完了");

  // 4. 削除後の確認
  console.log("\n4. 削除後の全件SELECT...");
  const afterDelete = await db.select().from(customers);
  console.log(`   取得件数: ${afterDelete.length}件`);
  if (afterDelete.length === 0) {
    console.log("   ✓ 件数が0件であることを確認");
  } else {
    console.log("   ✗ レコードが残っています");
  }

  console.log("\n=== DB接続テスト完了 ===");
})();
