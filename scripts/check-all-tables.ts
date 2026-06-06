import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url: url!, authToken: authToken! });

async function checkTable(name: string) {
  try {
    const info = await client.execute(`PRAGMA table_info(${name})`);
    if (info.rows.length === 0) {
      console.log(`${name}: ⚠️  NOT FOUND`);
      return;
    }
    const cols = info.rows.map(r => r.name).join(", ");
    const cnt = await client.execute(`SELECT COUNT(*) as cnt FROM ${name}`);
    console.log(`${name} (${cnt.rows[0].cnt} rows): ${cols}`);
  } catch (e: any) {
    console.log(`${name}: ❌ ${e.message}`);
  }
}

async function main() {
  const tables = ["ownerships", "vehicles", "customers", "shop_settings", "insurances"];
  for (const t of tables) {
    await checkTable(t);
  }
  client.close();
}
main().catch(console.error);
