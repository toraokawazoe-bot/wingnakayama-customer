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

(async () => {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' AND name NOT LIKE 'libsql_%' ORDER BY name"
  );

  console.log("=== Turso DB テーブル一覧 ===");
  if (result.rows.length === 0) {
    console.log("（テーブルなし）");
  } else {
    result.rows.forEach((row) => console.log(" -", row.name));
  }

  client.close();
})();
