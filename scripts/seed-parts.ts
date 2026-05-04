import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const INITIAL_PARTS = [
  { name: "ホンダ純正オイルG1 1L", category: "オイル", sku: "G1-1L", supplier: "ホンダ", purchasePrice: 500, sellingPrice: 800, currentStock: 20, minStock: 5, unit: "本" },
  { name: "オイルフィルター(汎用)", category: "オイル", sku: null, supplier: null, purchasePrice: 300, sellingPrice: 500, currentStock: 10, minStock: 3, unit: "個" },
  { name: "50ccタイヤ(前)", category: "タイヤ", sku: null, supplier: null, purchasePrice: 5000, sellingPrice: 8000, currentStock: 4, minStock: 2, unit: "本" },
  { name: "50ccタイヤ(後)", category: "タイヤ", sku: null, supplier: null, purchasePrice: 6000, sellingPrice: 9000, currentStock: 4, minStock: 2, unit: "本" },
];

const WORK_ITEM_PART_LINKS = [
  { workItemName: "オイル交換", partName: "ホンダ純正オイルG1 1L", quantity: 1 },
  { workItemName: "オイルフィルター交換", partName: "オイルフィルター(汎用)", quantity: 1 },
  { workItemName: "タイヤ交換（前）", partName: "50ccタイヤ(前)", quantity: 1 },
  { workItemName: "タイヤ交換（後）", partName: "50ccタイヤ(後)", quantity: 1 },
];

async function main() {
  const now = Date.now();

  // parts 投入（重複防止）
  const partIdMap = new Map<string, number>();

  for (const p of INITIAL_PARTS) {
    const existing = await client.execute({
      sql: "SELECT id FROM parts WHERE name = ?",
      args: [p.name],
    });

    if (existing.rows.length > 0) {
      console.log(`部品スキップ（既存）: ${p.name}`);
      partIdMap.set(p.name, Number(existing.rows[0].id));
      continue;
    }

    const result = await client.execute({
      sql: `INSERT INTO parts (name, category, sku, supplier, purchase_price, selling_price, current_stock, min_stock, unit, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [p.name, p.category, p.sku, p.supplier, p.purchasePrice, p.sellingPrice, p.currentStock, p.minStock, p.unit, now, now],
    });
    const newId = Number(result.lastInsertRowid);
    partIdMap.set(p.name, newId);
    console.log(`✅ 部品投入: ${p.name} (id=${newId})`);
  }

  // work_item_parts 紐付け
  for (const link of WORK_ITEM_PART_LINKS) {
    const wiRows = await client.execute({
      sql: "SELECT id FROM work_items WHERE name = ? LIMIT 1",
      args: [link.workItemName],
    });
    if (wiRows.rows.length === 0) {
      console.log(`作業マスタ未発見（スキップ）: ${link.workItemName}`);
      continue;
    }

    const partId = partIdMap.get(link.partName);
    if (!partId) {
      console.log(`部品未発見（スキップ）: ${link.partName}`);
      continue;
    }

    const workItemId = Number(wiRows.rows[0].id);

    const existing = await client.execute({
      sql: "SELECT id FROM work_item_parts WHERE work_item_id = ? AND part_id = ?",
      args: [workItemId, partId],
    });
    if (existing.rows.length > 0) {
      console.log(`紐付けスキップ（既存）: ${link.workItemName} ↔ ${link.partName}`);
      continue;
    }

    await client.execute({
      sql: "INSERT INTO work_item_parts (work_item_id, part_id, quantity) VALUES (?, ?, ?)",
      args: [workItemId, partId, link.quantity],
    });
    console.log(`✅ 紐付け: ${link.workItemName} ↔ ${link.partName} × ${link.quantity}`);
  }

  client.close();
  console.log("\n完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
