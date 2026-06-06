import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL または TURSO_AUTH_TOKEN が未設定です");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  const info = await client.execute("PRAGMA table_info(users)");
  console.log("=== users table columns ===");
  info.rows.forEach(r => console.log(`  ${r.cid} ${r.name} ${r.type} notnull=${r.notnull}`));
  
  // Also check if display_name column exists
  const hasDisplayName = info.rows.some(r => r.name === "display_name");
  console.log(`\ndisplay_name column exists: ${hasDisplayName}`);
  
  client.close();
}

main().catch(console.error);
