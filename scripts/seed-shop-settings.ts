import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { shopSettings } from "../src/db/schema/shop";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client);

async function main() {
  const existing = await db.select().from(shopSettings);
  if (existing.length > 0) {
    console.log("既存の店舗設定があります。スキップします。");
    client.close();
    return;
  }

  await db.insert(shopSettings).values({ shopName: "ウイング中山" });
  console.log("店舗設定の初期データを投入しました。");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
