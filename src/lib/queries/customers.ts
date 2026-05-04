import { db, customers } from "@/db";
import { eq } from "drizzle-orm";

export async function getCustomerById(id: number) {
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  return result[0] ?? null;
}

export type Customer = NonNullable<Awaited<ReturnType<typeof getCustomerById>>>;
