import { db, shopSettings } from "@/db";

export async function getShopSettings() {
  const result = await db.select().from(shopSettings).limit(1);
  return result[0] ?? null;
}

export type ShopSettings = NonNullable<Awaited<ReturnType<typeof getShopSettings>>>;
