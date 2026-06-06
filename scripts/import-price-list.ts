// 価格一覧表（有限会社ウイングナカヤマ・2026.06.01現在の紙）を作業マスタに一括取り込み。
// 同名の作業が既にある場合はスキップ（既存データは触らない）。
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// ★…写真の表記が曖昧だったため要確認の項目（名前は作業マスタ画面で修正可能）
const ITEMS: { name: string; category: string; price: number }[] = [
  // 電球
  { name: "電球交換 18/5", category: "電球", price: 1650 },
  { name: "電球交換 18/18", category: "電球", price: 1870 },
  { name: "電球交換 21/5", category: "電球", price: 1650 },
  { name: "電球交換 30/30", category: "電球", price: 1870 },
  { name: "電球交換 35/30", category: "電球", price: 2750 },
  { name: "電球交換 40/40", category: "電球", price: 3300 },
  { name: "電球交換 HS1", category: "電球", price: 3300 },
  // バッテリー
  { name: "バッテリー交換 4", category: "バッテリー", price: 8000 },
  { name: "バッテリー交換 5L", category: "バッテリー", price: 9900 },
  { name: "バッテリー交換 5S", category: "バッテリー", price: 11000 },
  { name: "バッテリー交換 6V", category: "バッテリー", price: 12000 },
  { name: "バッテリー交換 7Z", category: "バッテリー", price: 13200 },
  { name: "バッテリー交換 9BS", category: "バッテリー", price: 14300 },
  { name: "バッテリー交換 BTR4A-5", category: "バッテリー", price: 8800 },
  // 一般
  { name: "オイル交換 〜90cc", category: "一般", price: 1700 },
  { name: "オイル交換 91〜125cc", category: "一般", price: 1800 },
  { name: "オイル交換 リキモリ10W-40 1L", category: "一般", price: 2500 },
  { name: "Fブレーキワイヤー交換", category: "一般", price: 4400 }, // 4400〜
  { name: "Rブレーキワイヤー交換", category: "一般", price: 7700 }, // 7700〜
  { name: "メーターワイヤー交換", category: "一般", price: 4400 }, // 4400〜
  { name: "チェーン調整", category: "一般", price: 1100 }, // 1100〜
  { name: "パンク修理", category: "一般", price: 1650 },
  { name: "パンク調べ", category: "一般", price: 1300 },
  { name: "合鍵作成（カギ有り）", category: "一般", price: 2200 }, // 2200〜
  { name: "合鍵作成（カギ無し）", category: "一般", price: 8800 }, // 8800〜
  // 自転車
  { name: "自転車 パンク修理", category: "自転車", price: 1300 },
  { name: "自転車 パンク調べ", category: "自転車", price: 1100 },
  { name: "自転車 チェーン調整", category: "自転車", price: 550 },
  { name: "自転車 ブレーキワイヤー（前）", category: "自転車", price: 1320 }, // ★前後の区別は推測
  { name: "自転車 ブレーキワイヤー（後）", category: "自転車", price: 1650 }, // ★前後の区別は推測
  { name: "自転車 切替ワイヤー", category: "自転車", price: 2200 }, // 2200〜
  { name: "自転車 タイヤ交換", category: "自転車", price: 6000 }, // 6000〜
  { name: "自転車 タイヤ交換 2本同時", category: "自転車", price: 11000 }, // 11000〜
  { name: "自転車 チューブ交換", category: "自転車", price: 2750 }, // 2750〜
  { name: "自転車 TS点検", category: "自転車", price: 2500 },
  { name: "自転車 リム交換", category: "自転車", price: 6600 },
  { name: "自転車 スポーク交換（1本）", category: "自転車", price: 1100 }, // 1100〜
  { name: "自転車 ブレーキゴム交換", category: "自転車", price: 1650 }, // 1650〜
  // タイヤ
  { name: "タイヤ交換 3.00/10", category: "タイヤ", price: 8800 },
  { name: "タイヤ交換 2本同時（10インチ）", category: "タイヤ", price: 16600 }, // ★3.00/10の直下の行
  { name: "タイヤ交換 3.50/10", category: "タイヤ", price: 11000 },
  { name: "タイヤ交換 100/90-10", category: "タイヤ", price: 12100 },
  { name: "タイヤ交換 90/90-12", category: "タイヤ", price: 11000 },
  { name: "タイヤ交換 110/90-12", category: "タイヤ", price: 13200 },
  { name: "タイヤ交換 120/90-12", category: "タイヤ", price: 13700 },
  { name: "タイヤ交換 130/90-12", category: "タイヤ", price: 14300 },
  { name: "タイヤ交換 80/90-14", category: "タイヤ", price: 12100 },
  { name: "タイヤ交換 90/90-14", category: "タイヤ", price: 13200 },
  { name: "タイヤ交換 100/90-14", category: "タイヤ", price: 14300 },
  { name: "タイヤ交換 2.25/17 ①", category: "タイヤ", price: 7000 }, // ★同規格2行（前後?銘柄?）
  { name: "タイヤ交換 2.25/17 ②", category: "タイヤ", price: 7700 }, // ★同上
  { name: "タイヤ交換 2.50-17 ①", category: "タイヤ", price: 7700 }, // ★同上
  { name: "タイヤ交換 2.50-17 ②", category: "タイヤ", price: 8800 }, // ★同上
  { name: "タイヤ交換 カブ強化", category: "タイヤ", price: 9900 },
  { name: "チューブ交換", category: "タイヤ", price: 4400 },
  { name: "チューブ同時交換", category: "タイヤ", price: 2200 },
  { name: "エアバルブ交換", category: "タイヤ", price: 1650 },
  // その他
  { name: "12ヶ月点検 〜50cc", category: "その他", price: 3300 },
  { name: "12ヶ月点検 〜125cc", category: "その他", price: 4400 },
  { name: "12ヶ月点検 〜250cc", category: "その他", price: 8800 },
  { name: "納車整備手数料 〜125cc", category: "その他", price: 15400 },
  { name: "納車整備手数料 軽二輪", category: "その他", price: 22000 },
  { name: "下取車諸手続 〜125cc", category: "その他", price: 3300 },
  { name: "下取車諸手続 軽二輪", category: "その他", price: 3300 },
  { name: "防犯登録手数料 〜125cc", category: "その他", price: 1100 },
  { name: "防犯登録手数料 軽二輪", category: "その他", price: 1100 },
  // 自賠責
  { name: "自賠責保険 1年", category: "自賠責", price: 6910 },
  { name: "自賠責保険 2年", category: "自賠責", price: 8560 },
  { name: "自賠責保険 3年", category: "自賠責", price: 10170 },
  { name: "自賠責保険 4年", category: "自賠責", price: 11760 },
  { name: "自賠責保険 5年", category: "自賠責", price: 13310 },
];

async function main() {
  // 既存の作業名（重複スキップ用）と最大displayOrder
  const existing = await client.execute("SELECT name FROM work_items");
  const existingNames = new Set(existing.rows.map((r) => String(r.name)));
  const maxOrderResult = await client.execute(
    "SELECT COALESCE(MAX(display_order), 0) AS m FROM work_items"
  );
  let order = Number(maxOrderResult.rows[0].m);

  let inserted = 0;
  let skipped = 0;
  for (const item of ITEMS) {
    if (existingNames.has(item.name)) {
      console.log(`⏭️  スキップ（既存）: ${item.name}`);
      skipped++;
      continue;
    }
    order += 1;
    await client.execute({
      sql: "INSERT INTO work_items (name, category, default_price, display_order, is_active) VALUES (?, ?, ?, ?, 1)",
      args: [item.name, item.category, item.price, order],
    });
    inserted++;
  }

  console.log(`\n✅ 取り込み完了: 追加 ${inserted}件 / スキップ ${skipped}件 / 全${ITEMS.length}件`);

  const counts = await client.execute(
    "SELECT category, COUNT(*) AS c FROM work_items WHERE is_active = 1 GROUP BY category ORDER BY c DESC"
  );
  console.log("\nカテゴリ別（有効のみ）:");
  counts.rows.forEach((r) => console.log(`  ${r.category ?? "（未分類）"}: ${r.c}件`));

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
