import { db, parts, workItemParts } from "@/db";
import { eq, lte, and, asc } from "drizzle-orm";

export type Part = typeof parts.$inferSelect;
export type WorkItemPart = typeof workItemParts.$inferSelect & { part: Part };

export async function getActivePartsList() {
  return db
    .select()
    .from(parts)
    .where(eq(parts.isActive, true))
    .orderBy(asc(parts.category), asc(parts.name));
}

export async function getAllPartsList() {
  return db
    .select()
    .from(parts)
    .orderBy(asc(parts.category), asc(parts.name));
}

export async function getPartById(id: number) {
  const result = await db.select().from(parts).where(eq(parts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getLowStockParts() {
  return db
    .select()
    .from(parts)
    .where(and(eq(parts.isActive, true), lte(parts.currentStock, parts.minStock)))
    .orderBy(asc(parts.category), asc(parts.name));
}

export async function getPartsForWorkItem(workItemId: number) {
  return db
    .select({
      id: workItemParts.id,
      workItemId: workItemParts.workItemId,
      partId: workItemParts.partId,
      quantity: workItemParts.quantity,
      partName: parts.name,
      partCategory: parts.category,
      partUnit: parts.unit,
      partCurrentStock: parts.currentStock,
      partSellingPrice: parts.sellingPrice,
    })
    .from(workItemParts)
    .innerJoin(parts, eq(workItemParts.partId, parts.id))
    .where(eq(workItemParts.workItemId, workItemId))
    .orderBy(asc(parts.name));
}
