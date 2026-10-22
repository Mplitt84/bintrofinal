import { eq, desc, asc, like, or, sql, inArray, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, movements } from "../../db/schema.js";
import { DEFAULT_REORDER_THRESHOLD, clampOrderQty, deriveInitials, stockStats } from "../lib/inventory-defaults.js";
import type { PurchaseOrderLine } from "../lib/purchase-order.js";

export type Product = typeof products.$inferSelect;
export type Movement = typeof movements.$inferSelect;

export async function findAllProducts() {
  return db.select().from(products).orderBy(asc(products.name));
}

export async function findProductByBarcode(barcode: string) {
  const rows = await db.select().from(products).where(eq(products.barcode, barcode));
  return rows[0] ?? null;
}

export async function findProductById(productId: number) {
  const rows = await db.select().from(products).where(eq(products.id, productId));
  return rows[0] ?? null;
}

export async function findProductsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}

export async function searchProductsByText(query: string) {
  const q = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(products)
    .where(
      or(
        like(sql`lower(${products.name})`, q),
        like(sql`lower(${products.barcode})`, q),
        like(sql`lower(${products.brand})`, q),
        like(sql`lower(${products.category})`, q),
      ),
    )
    .orderBy(asc(products.name))
    .limit(20);
}

export async function insertProduct(data: {
  barcode: string;
  name: string;
  category?: string;
  brand?: string;
  vendor?: string;
  size?: string;
  qty?: number;
  reorderThreshold?: number;
  unitCostCents?: number;
  retailPriceCents?: number;
  imageUrl?: string;
}) {
  const [row] = await db
    .insert(products)
    .values({
      barcode: data.barcode,
      name: data.name,
      category: data.category ?? "",
      brand: data.brand ?? "",
      vendor: data.vendor ?? "",
      size: data.size ?? "",
      qty: data.qty ?? 0,
      reorderThreshold: data.reorderThreshold ?? DEFAULT_REORDER_THRESHOLD,
      unitCostCents: data.unitCostCents ?? 0,
      retailPriceCents: data.retailPriceCents ?? 0,
      imageUrl: data.imageUrl ?? "",
      priceUpdatedAt: data.unitCostCents || data.retailPriceCents ? new Date() : null,
    })
    .returning();
  return row;
}

export async function updateProductBarcode(productId: number, barcode: string) {
  const [row] = await db
    .update(products)
    .set({ barcode, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();
  return row;
}

export async function updateProductFields(
  productId: number,
  data: Partial<{
    name: string;
    category: string;
    brand: string;
    vendor: string;
    size: string;
    reorderThreshold: number;
    unitCostCents: number;
    retailPriceCents: number;
    imageUrl: string;
  }>,
) {
  // Stamp the price date only when cost or retail actually changes, so the
  // "update prices" reminder isn't silenced by editing a name.
  const cost = data.unitCostCents ?? null;
  const retail = data.retailPriceCents ?? null;
  const priceUpdatedAt =
    cost === null && retail === null
      ? undefined
      : sql`case when ${products.unitCostCents} <> coalesce(${cost}::integer, ${products.unitCostCents})
          or ${products.retailPriceCents} <> coalesce(${retail}::integer, ${products.retailPriceCents})
          then now() else ${products.priceUpdatedAt} end`;
  const [row] = await db
    .update(products)
    .set({ ...data, ...(priceUpdatedAt ? { priceUpdatedAt } : {}), updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();
  return row;
}

/** Records that staff checked a product's prices and they're still right (or were just changed). */
export async function markPricesChecked(productId: number, prices: { unitCostCents?: number; retailPriceCents?: number } = {}) {
  const [row] = await db
    .update(products)
    .set({ ...prices, priceUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();
  return row ?? null;
}

export async function applyMovement(params: {
  productId: number;
  type: "in" | "out" | "adjust" | "receive";
  delta: number;
  staffName: string;
  note?: string;
}) {
  const [updated] = await db
    .update(products)
    .set({ qty: sql`${products.qty} + ${params.delta}`, updatedAt: new Date() })
    .where(eq(products.id, params.productId))
    .returning();

  const [movement] = await db
    .insert(movements)
    .values({
      productId: params.productId,
      type: params.type,
      delta: params.delta,
      staffName: params.staffName.trim(),
      staffInitials: deriveInitials(params.staffName),
      note: params.note ?? "",
    })
    .returning();

  return { product: updated, movement };
}

export async function findRecentMovements(limit: number) {
  return db
    .select({
      id: movements.id,
      productId: movements.productId,
      type: movements.type,
      delta: movements.delta,
      staffInitials: movements.staffInitials,
      staffName: movements.staffName,
      note: movements.note,
      createdAt: movements.createdAt,
      productName: products.name,
      productBrand: products.brand,
      productBarcode: products.barcode,
      productImageUrl: products.imageUrl,
    })
    .from(movements)
    .innerJoin(products, eq(movements.productId, products.id))
    .orderBy(desc(movements.createdAt))
    .limit(limit);
}

/**
 * Every movement since `since`, joined with the product details the Activity tab
 * groups and prices by. Capped so an "all time" view stays quick.
 */
export async function findMovementsSince(since: Date | null, limit = 5000) {
  const query = db
    .select({
      id: movements.id,
      productId: movements.productId,
      type: movements.type,
      delta: movements.delta,
      staffName: movements.staffName,
      staffInitials: movements.staffInitials,
      createdAt: movements.createdAt,
      productName: products.name,
      productBrand: products.brand,
      productSize: products.size,
      productImageUrl: products.imageUrl,
      unitCostCents: products.unitCostCents,
    })
    .from(movements)
    .innerJoin(products, eq(movements.productId, products.id));
  const filtered = since ? query.where(gte(movements.createdAt, since)) : query;
  return filtered.orderBy(desc(movements.createdAt)).limit(limit);
}

export async function findMovementById(id: number) {
  const rows = await db.select().from(movements).where(eq(movements.id, id));
  return rows[0] ?? null;
}

export async function reverseAndDeleteMovement(id: number) {
  const movement = await findMovementById(id);
  if (!movement) return null;

  const [product] = await db
    .update(products)
    .set({ qty: sql`${products.qty} - ${movement.delta}`, updatedAt: new Date() })
    .where(eq(products.id, movement.productId))
    .returning();

  await db.delete(movements).where(eq(movements.id, id));

  return product;
}

/**
 * Removes a product for good. Its movement history goes with it (movements
 * reference the product), so past spend for it drops out of Activity and Budget.
 */
export async function deleteProductById(productId: number) {
  await db.delete(movements).where(eq(movements.productId, productId));
  const [row] = await db.delete(products).where(eq(products.id, productId)).returning();
  return row ?? null;
}

export async function computeStats() {
  return stockStats(await db.select().from(products));
}

/**
 * Every product at or below its own par/reorder level, worst shortfall first.
 * Used by both the Below Par tab and the restock email so the two never disagree.
 */
export async function findBelowParProducts() {
  return db
    .select()
    .from(products)
    .where(sql`${products.qty} <= ${products.reorderThreshold}`)
    .orderBy(sql`${products.reorderThreshold} - ${products.qty} desc`, asc(products.name));
}

/**
 * Turns the staff's ticked rows into authoritative order lines: names, costs and
 * on-hand counts always come from the database, only the quantity comes from the
 * client (clamped to a sane range). Requests for products that no longer exist are
 * dropped so a stale tab can never email a phantom line.
 */
export async function buildPurchaseOrderLines(
  requests: { productId: number; qty: number }[],
): Promise<PurchaseOrderLine[]> {
  const rows = await findProductsByIds(requests.map((r) => r.productId));
  const byId = new Map(rows.map((row) => [row.id, row]));

  return requests.flatMap((request) => {
    const product = byId.get(request.productId);
    if (!product) return [];
    return [
      {
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        vendor: product.vendor,
        size: product.size,
        category: product.category,
        qty: clampOrderQty(request.qty),
        onHand: product.qty,
        reorderThreshold: product.reorderThreshold,
        unitCostCents: product.unitCostCents,
      },
    ];
  });
}
