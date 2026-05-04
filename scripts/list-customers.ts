import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

(async () => {
  const { db, customers } = await import("../src/db/index");

  const rows = await db
    .select({
      id: customers.id,
      lastName: customers.lastName,
      firstName: customers.firstName,
      prefecture: customers.prefecture,
      city: customers.city,
      createdAt: customers.createdAt,
    })
    .from(customers);

  console.log(`customers テーブル件数: ${rows.length}`);
  rows.forEach((r) =>
    console.log(
      ` - [${r.id}] ${r.lastName} ${r.firstName} | ${r.prefecture ?? "-"} ${r.city ?? "-"} | ${r.createdAt?.toISOString() ?? "-"}`
    )
  );
})();
