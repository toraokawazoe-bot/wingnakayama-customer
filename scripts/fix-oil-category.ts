// 価格表取り込みで「一般」に入ったオイル系作業を「オイル」カテゴリへ移動する一回限りのスクリプト。
// （「オイル」タブに 250cc しか出ない問題の修正。旧 50cc/125cc は無効化済みのため触らない）
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// name → 表示順（オイル: 〜90cc → 91〜125cc → 250cc(既存12) → リキモリ → フィルター(既存14)）
const MOVES: { name: string; displayOrder: number }[] = [
  { name: "オイル交換 〜90cc", displayOrder: 10 },
  { name: "オイル交換 91〜125cc", displayOrder: 11 },
  { name: "オイル交換 リキモリ10W-40 1L", displayOrder: 13 },
];

async function main() {
  for (const m of MOVES) {
    const result = await client.execute({
      sql: "UPDATE work_items SET category = 'オイル', display_order = ? WHERE name = ? AND category = '一般'",
      args: [m.displayOrder, m.name],
    });
    console.log(`${result.rowsAffected > 0 ? "✅ 移動" : "⏭️  対象なし（移動済み？）"}: ${m.name}`);
  }

  const rs = await client.execute(
    "SELECT name, default_price, is_active, display_order FROM work_items WHERE category = 'オイル' ORDER BY display_order"
  );
  console.log("\n「オイル」カテゴリの現状:");
  rs.rows.forEach((r) =>
    console.log(`  ${r.is_active ? "○" : "×(無効)"} ${r.name} ¥${r.default_price} (order=${r.display_order})`)
  );

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
