import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
async function main() {
  const r = await client.execute("SELECT o.id, o.customer_id, o.vehicle_id, o.end_date, c.last_name, c.first_name FROM ownerships o JOIN customers c ON o.customer_id = c.id");
  r.rows.forEach(row => console.log(JSON.stringify(row)));
  client.close();
}
main().catch(console.error);
