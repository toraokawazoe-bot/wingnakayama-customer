import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

(async () => {
  const { db, users } = await import("../src/db/index");
  const { sql } = await import("drizzle-orm");

  const total = await db.select({ count: sql<number>`count(*)` }).from(users);
  const byRole = await db
    .select({ role: users.role, count: sql<number>`count(*)` })
    .from(users)
    .groupBy(users.role);

  console.log(`総件数: ${total[0].count}`);
  console.log("役割別内訳:");
  byRole.forEach((r) => console.log(`  ${r.role}: ${r.count}件`));
})();
