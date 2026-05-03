import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

(async () => {
  const { db, users } = await import("../src/db/index");

  const result = await db
    .select({ email: users.email, displayName: users.displayName, role: users.role })
    .from(users);

  console.log(`users テーブル件数: ${result.length}`);
  result.forEach((u) => console.log(` - ${u.email} | ${u.displayName} | ${u.role}`));
})();
