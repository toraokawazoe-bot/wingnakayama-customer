import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { workItems } from "../src/db/schema/maintenance";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const db = drizzle(client);

const SEED_DATA = [
  { name: "オイル交換", category: "オイル", defaultPrice: 1500, displayOrder: 10 },
  { name: "オイルフィルター交換", category: "オイル", defaultPrice: 800, displayOrder: 11 },
  { name: "タイヤ交換（前）", category: "タイヤ", defaultPrice: 8000, displayOrder: 20 },
  { name: "タイヤ交換（後）", category: "タイヤ", defaultPrice: 9000, displayOrder: 21 },
  { name: "チェーン調整", category: "チェーン", defaultPrice: 1000, displayOrder: 30 },
  { name: "チェーン交換", category: "チェーン", defaultPrice: 6000, displayOrder: 31 },
  { name: "ブレーキパッド交換（前）", category: "ブレーキ", defaultPrice: 5000, displayOrder: 40 },
  { name: "ブレーキパッド交換（後）", category: "ブレーキ", defaultPrice: 5000, displayOrder: 41 },
  { name: "バッテリー交換", category: "電装", defaultPrice: 8000, displayOrder: 50 },
  { name: "点検", category: "点検", defaultPrice: 2000, displayOrder: 60 },
  { name: "車検整備", category: "車検", defaultPrice: 15000, displayOrder: 70 },
];

async function main() {
  const existing = await db.select().from(workItems);
  if (existing.length > 0) {
    console.log(`既存データが ${existing.length} 件あります。シードをスキップします。`);
    client.close();
    return;
  }

  await db.insert(workItems).values(SEED_DATA);
  console.log(`${SEED_DATA.length} 件の作業マスタを投入しました。`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
