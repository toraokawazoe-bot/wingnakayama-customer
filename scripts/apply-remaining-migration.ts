import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // work_items テーブルが存在しない場合のみ作成
  await client.execute(`
    CREATE TABLE IF NOT EXISTS \`work_items\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`category\` text,
      \`default_price\` integer NOT NULL,
      \`display_order\` integer DEFAULT 0 NOT NULL,
      \`is_active\` integer DEFAULT true NOT NULL,
      \`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
      \`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
    )
  `);
  console.log("work_items テーブルを確認/作成しました。");

  // maintenance_records が存在しない場合のみ作成（念のため）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS \`maintenance_records\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`vehicle_id\` integer NOT NULL,
      \`work_item_id\` integer,
      \`work_name\` text NOT NULL,
      \`price\` integer NOT NULL,
      \`mileage\` integer,
      \`performed_at\` text NOT NULL,
      \`staff_id\` text,
      \`memo\` text,
      \`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
      FOREIGN KEY (\`vehicle_id\`) REFERENCES \`vehicles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
      FOREIGN KEY (\`work_item_id\`) REFERENCES \`work_items\`(\`id\`) ON UPDATE no action ON DELETE no action,
      FOREIGN KEY (\`staff_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
    )
  `);
  console.log("maintenance_records テーブルを確認/作成しました。");

  // drizzle_migrations テーブルに 0002 を記録（未記録の場合のみ）
  await client.execute(`
    INSERT OR IGNORE INTO __drizzle_migrations (id, hash, created_at)
    VALUES ('0002_faulty_triton', '0002_faulty_triton', unixepoch() * 1000)
  `);
  console.log("マイグレーション記録を更新しました。");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
