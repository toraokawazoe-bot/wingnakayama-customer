"use server";

import { auth } from "@/auth";
import { getCustomersWithVehicles, type CustomerWithVehicles } from "@/lib/queries/dashboard";

export type SearchCustomersResult =
  | { ok: true; customers: CustomerWithVehicles[] }
  | { ok: false; error: string };

export async function searchCustomersAction(
  query: string
): Promise<SearchCustomersResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const customers = await getCustomersWithVehicles(query.trim() || undefined);
  return { ok: true, customers };
}
