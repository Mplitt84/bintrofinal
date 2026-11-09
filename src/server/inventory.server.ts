import { and, eq, desc, asc, like, or, sql, inArray, gte, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, movements, integrations, squareOutbox } from "../../db/schema.js";
import { DEFAULT_REORDER_THRESHOLD, clampOrderQty, deriveInitials, onHandQty, selectBelowPar, stockStats } from "../lib/inventory-defaults.js";
import type { PurchaseOrderLine } from "../lib/purchase-order.js";

export type Product = typeof products.$inferSelect;
export type Movement = typeof movements.$inferSelect;

export async function findAllProducts() {
  return db.select().from(products).orderBy(asc(products.name));
}

export async function findProductByBarcode(barcode: string) {
  const rows = await db
    .select()
    .from(products)
    .where(or(eq(products.barcode, barcode), sql`${barcode} = any(${products.extraBarcodes})`))
    .orderBy(sql`${products.barcode} = ${barcode} desc`)
    .limit(1);
  return rows[0] ?? null;
}

/** The product (other than `exceptId`) that already scans with this code, as its main or an extra barcode. */
export async function findBarcodeOwner(barcode: string, exceptId = 0) {
  const rows = await db
    .select()
    .from(products)
    .where(
      sql`${products.id} <> ${exceptId} and (${products.barcode} = ${barcode} or ${barcode} = any(${products.extraBarcodes}))`,
    )
    .limit(1);
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
        like(sql`lower(array_to_string(${products.extraBarcodes}, ' '))`, q),
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
  maxQty?: number;
  packSize?: number;
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
      maxQty: Math.max(0, data.maxQty ?? 0),
      packSize: Math.max(1, data.packSize ?? 1),
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
    maxQty: number;
    packSize: number;
    unitCostCents: number;
    retailPriceCents: number;
    imageUrl: string;
    extraBarcodes: string[];
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

/** Movements recorded under this name came from Square itself and are never sent back. */
export const SQUARE_STAFF_NAME = "Square POS";

/** True when Square is connected, so stock changes on linked products should follow to Square. */
async function squareConnected() {
  const rows = await db
    .select({ provider: integrations.provider })
    .from(integrations)
    .where(and(eq(integrations.provider, "square"), ne(integrations.accessToken, "")));
  return rows.length > 0;
}

/**
 * Queues a stock change for Square when the product is linked to a Square item.
 * Stock counts ('adjust') set Square's count to Bintro's; everything else is sent
 * as a +/- change, so a Square sale and a Bintro delivery at the same moment both land.
 */
async function queueSquareChange(product: Product | undefined, movement: Movement, type: string) {
  if (!product?.squareVariationId || movement.staffName === SQUARE_STAFF_NAME) return false;
  if (!(await squareConnected())) return false;
  await db.insert(squareOutbox).values(
    type === "adjust"
      ? { productId: product.id, variationId: product.squareVariationId, kind: "count", quantity: Math.max(0, product.qty), movementId: movement.id }
      : { productId: product.id, variationId: product.squareVariationId, kind: "delta", quantity: movement.delta, movementId: movement.id },
  );
  return true;
}

/** Sends queued changes to Square now. Failures stay queued for the scheduled retry. */
export async function flushSquareSoon() {
  try {
    const { flushSquareOutbox } = await import("./integrations.server.js");
    await flushSquareOutbox();
  } catch (error) {
    console.error("Square inventory push failed; will retry", error);
  }
}

export async function applyMovement(params: {
  productId: number;
  type: "in" | "out" | "adjust" | "receive";
  delta: number;
  staffName: string;
  note?: string;
  /** 'now' (default) sends the change to Square right away; 'later' only queues it (bulk imports flush once at the end). */
  square?: "now" | "later";
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

  const queued = await queueSquareChange(updated, movement, params.type).catch((error) => {
    console.error("Could not queue Square change", error);
    return false;
  });
  if (queued && params.square !== "later") await flushSquareSoon();

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
  await undoSquareChange(movement, product);

  return product;
}

/**
 * Keeps Square in step with an undo: a change not yet sent is simply dropped;
 * one already sent is reversed (a -/+ change, or the restored count).
 */
async function undoSquareChange(movement: Movement, product: Product | undefined) {
  try {
    const queued = await db.select().from(squareOutbox).where(eq(squareOutbox.movementId, movement.id));
    if (queued.length === 0) return;
    const pending = queued.filter((r) => r.status === "pending");
    if (pending.length) await db.delete(squareOutbox).where(inArray(squareOutbox.id, pending.map((r) => r.id)));
    const sent = queued.find((r) => r.status === "sent");
    if (!sent || !product) return;
    await db.insert(squareOutbox).values(
      sent.kind === "count"
        ? { productId: product.id, variationId: sent.variationId, kind: "count", quantity: Math.max(0, product.qty) }
        : { productId: product.id, variationId: sent.variationId, kind: "delta", quantity: -sent.quantity },
    );
    await flushSquareSoon();
  } catch (error) {
    console.error("Could not undo Square change", error);
  }
}

/**
 * Folds a duplicate product into the real one. The kept product keeps its own
 * count and details, picks up anything it's missing (barcode as an extra code,
 * Square link, brand, size, prices, photo), and takes over the duplicate's scan
 * and sales history. Starting counts copied in from Square are dropped rather
 * than added, so stock isn't counted twice. If the kept product is linked to
 * Square, its count is then sent to Square so both agree.
 */
export async function mergeProductsInto(sourceId: number, targetId: number) {
  if (sourceId === targetId) throw new Error("Pick a different product to merge into.");
  const [source, target] = await Promise.all([findProductById(sourceId), findProductById(targetId)]);
  if (!source || !target) throw new Error("One of those products no longer exists.");
  if (source.squareVariationId && target.squareVariationId && source.squareVariationId !== target.squareVariationId) {
    throw new Error("Both products are linked to different Square items. Merge or fix them in Square first.");
  }

  // Drop starting counts copied from Square; keep real scans and sales and move them over.
  const sourceMoves = await db.select().from(movements).where(eq(movements.productId, sourceId));
  const seeded = sourceMoves.filter((m) => m.staffName === SQUARE_STAFF_NAME && m.type === "adjust");
  const carried = sourceMoves.filter((m) => !seeded.includes(m));
  const carriedDelta = carried.reduce((sum, m) => sum + m.delta, 0);
  if (seeded.length) await db.delete(movements).where(inArray(movements.id, seeded.map((m) => m.id)));
  if (carried.length) {
    await db.update(movements).set({ productId: targetId }).where(inArray(movements.id, carried.map((m) => m.id)));
  }
  await db.delete(squareOutbox).where(and(eq(squareOutbox.productId, sourceId), eq(squareOutbox.status, "pending")));
  await db.delete(products).where(eq(products.id, sourceId));

  const codes = [source.barcode, ...source.extraBarcodes].filter((c) => c && !c.startsWith("SQ-") && c !== target.barcode);
  const extraBarcodes = Array.from(new Set([...target.extraBarcodes, ...codes]));
  const [merged] = await db
    .update(products)
    .set({
      qty: sql`${products.qty} + ${carriedDelta}`,
      extraBarcodes,
      squareVariationId: target.squareVariationId || source.squareVariationId,
      brand: target.brand || source.brand,
      size: target.size || source.size,
      vendor: target.vendor || source.vendor,
      category: target.category || source.category,
      imageUrl: target.imageUrl || source.imageUrl,
      unitCostCents: target.unitCostCents || source.unitCostCents,
      retailPriceCents: target.retailPriceCents || source.retailPriceCents,
      updatedAt: new Date(),
    })
    .where(eq(products.id, targetId))
    .returning();

  if (merged?.squareVariationId && (await squareConnected())) {
    await db.insert(squareOutbox).values({
      productId: merged.id,
      variationId: merged.squareVariationId,
      kind: "count",
      quantity: Math.max(0, merged.qty),
    });
    await flushSquareSoon();
  }
  return { product: merged, moved: carried.length };
}

/**
 * Removes a product for good. Its movement history goes with it (movements
 * reference the product), so past spend for it drops out of Activity and Budget.
 */
export async function deleteProductById(productId: number) {
  await db.delete(squareOutbox).where(and(eq(squareOutbox.productId, productId), eq(squareOutbox.status, "pending")));
  await db.delete(movements).where(eq(movements.productId, productId));
  const [row] = await db.delete(products).where(eq(products.id, productId)).returning();
  return row ?? null;
}

export async function computeStats() {
  return stockStats(await db.select().from(products));
}

/**
 * Every product that is Out or Low, worst shortfall first, read live from the products
 * table. The restock email uses this; the Restock tab derives the same list from the
 * Products list with the same `selectBelowPar` rule.
 */
export async function findBelowParProducts() {
  return selectBelowPar(await findAllProducts());
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
        onHand: Math.max(0, onHandQty(product)),
        reorderThreshold: product.reorderThreshold,
        unitCostCents: product.unitCostCents,
      },
    ];
  });
}

/** How many movements carry exactly this note (used to stop the same sales report being logged twice). */
export async function countMovementsWithNote(note: string) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(movements).where(eq(movements.note, note));
  return row?.n ?? 0;
}
