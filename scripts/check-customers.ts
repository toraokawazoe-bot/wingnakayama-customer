import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
async function main() {
  const r = await client.execute("SELECT id, last_name, first_name FROM customers ORDER BY id");
  r.rows.forEach(row => console.log(JSON.stringify(row)));
  client.close();
}
main().catch(console.error);
