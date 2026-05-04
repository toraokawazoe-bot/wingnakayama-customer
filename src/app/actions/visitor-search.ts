"use server";

import { auth } from "@/auth";
import { searchCustomersWithStats, type CustomerSearchResult } from "@/lib/queries/customer-search";

export type VisitorSearchResult =
  | { ok: true; customers: CustomerSearchResult[] }
  | { ok: false; error: string };

export async function visitorSearchAction(query: string): Promise<VisitorSearchResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const customers = await searchCustomersWithStats(query.trim(), 10);
  return { ok: true, customers };
}
