import { asc, eq, desc, gte, or, sql, like, and, inArray, ne } from "drizzle-orm";
import { h as db, j as products, m as movements, E as squareOutbox, F as integrations } from "./auth.middleware-DMTTBk98.js";
import { a as stockStats, D as DEFAULT_REORDER_THRESHOLD, d as deriveInitials, b as selectBelowPar, o as onHandQty, c as clampOrderQty } from "./inventory-defaults-BnRHgx1T.js";
async function findAllProducts() {
  return db.select().from(products).orderBy(asc(products.name));
}
async function findProductByBarcode(barcode) {
  const rows = await db.select().from(products).where(or(eq(products.barcode, barcode), sql`${barcode} = any(${products.extraBarcodes})`)).orderBy(sql`${products.barcode} = ${barcode} desc`).limit(1);
  return rows[0] ?? null;
}
async function findBarcodeOwner(barcode, exceptId = 0) {
  const rows = await db.select().from(products).where(
    sql`${products.id} <> ${exceptId} and (${products.barcode} = ${barcode} or ${barcode} = any(${products.extraBarcodes}))`
  ).limit(1);
  return rows[0] ?? null;
}
async function findProductById(productId) {
  const rows = await db.select().from(products).where(eq(products.id, productId));
  return rows[0] ?? null;
}
async function findProductsByIds(ids) {
  if (ids.length === 0) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}
async function searchProductsByText(query) {
  const q = `%${query.toLowerCase()}%`;
  return db.select().from(products).where(
    or(
      like(sql`lower(${products.name})`, q),
      like(sql`lower(${products.barcode})`, q),
      like(sql`lower(array_to_string(${products.extraBarcodes}, ' '))`, q),
      like(sql`lower(${products.brand})`, q),
      like(sql`lower(${products.category})`, q)
    )
  ).orderBy(asc(products.name)).limit(20);
}
async function insertProduct(data) {
  const [row] = await db.insert(products).values({
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
    expiresOn: data.expiresOn ?? "",
    unitCostCents: data.unitCostCents ?? 0,
    retailPriceCents: data.retailPriceCents ?? 0,
    imageUrl: data.imageUrl ?? "",
    priceUpdatedAt: data.unitCostCents || data.retailPriceCents ? /* @__PURE__ */ new Date() : null
  }).returning();
  return row;
}
async function updateProductBarcode(productId, barcode) {
  const [row] = await db.update(products).set({ barcode, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, productId)).returning();
  return row;
}
async function updateProductFields(productId, data) {
  const cost = data.unitCostCents ?? null;
  const retail = data.retailPriceCents ?? null;
  const priceUpdatedAt = cost === null && retail === null ? void 0 : sql`case when ${products.unitCostCents} <> coalesce(${cost}::integer, ${products.unitCostCents})
          or ${products.retailPriceCents} <> coalesce(${retail}::integer, ${products.retailPriceCents})
          then now() else ${products.priceUpdatedAt} end`;
  const [row] = await db.update(products).set({ ...data, ...priceUpdatedAt ? { priceUpdatedAt } : {}, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, productId)).returning();
  return row;
}
async function markPricesChecked(productId, prices = {}) {
  const [row] = await db.update(products).set({ ...prices, priceUpdatedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, productId)).returning();
  return row ?? null;
}
const SQUARE_STAFF_NAME = "Square POS";
async function squareConnected() {
  const rows = await db.select({ provider: integrations.provider }).from(integrations).where(and(eq(integrations.provider, "square"), ne(integrations.accessToken, "")));
  return rows.length > 0;
}
async function queueSquareChange(product, movement, type) {
  if (!product?.squareVariationId || movement.staffName === SQUARE_STAFF_NAME) return false;
  if (!await squareConnected()) return false;
  await db.insert(squareOutbox).values(
    type === "adjust" ? { productId: product.id, variationId: product.squareVariationId, kind: "count", quantity: Math.max(0, product.qty), movementId: movement.id } : { productId: product.id, variationId: product.squareVariationId, kind: "delta", quantity: movement.delta, movementId: movement.id }
  );
  return true;
}
async function flushSquareSoon() {
  try {
    const { flushSquareOutbox } = await import("./integrations.server-DdHFkXyK.js");
    await flushSquareOutbox();
  } catch (error) {
    console.error("Square inventory push failed; will retry", error);
  }
}
async function applyMovement(params) {
  const [updated] = await db.update(products).set({ qty: sql`${products.qty} + ${params.delta}`, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, params.productId)).returning();
  const [movement] = await db.insert(movements).values({
    productId: params.productId,
    type: params.type,
    delta: params.delta,
    staffName: params.staffName.trim(),
    staffInitials: deriveInitials(params.staffName),
    note: params.note ?? ""
  }).returning();
  const queued = await queueSquareChange(updated, movement, params.type).catch((error) => {
    console.error("Could not queue Square change", error);
    return false;
  });
  if (queued && params.square !== "later") await flushSquareSoon();
  return { product: updated, movement };
}
async function findRecentMovements(limit) {
  return db.select({
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
    productImageUrl: products.imageUrl
  }).from(movements).innerJoin(products, eq(movements.productId, products.id)).orderBy(desc(movements.createdAt)).limit(limit);
}
async function findMovementsSince(since, limit = 5e3) {
  const query = db.select({
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
    unitCostCents: products.unitCostCents
  }).from(movements).innerJoin(products, eq(movements.productId, products.id));
  const filtered = since ? query.where(gte(movements.createdAt, since)) : query;
  return filtered.orderBy(desc(movements.createdAt)).limit(limit);
}
async function findMovementById(id) {
  const rows = await db.select().from(movements).where(eq(movements.id, id));
  return rows[0] ?? null;
}
async function reverseAndDeleteMovement(id) {
  const movement = await findMovementById(id);
  if (!movement) return null;
  const [product] = await db.update(products).set({ qty: sql`${products.qty} - ${movement.delta}`, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, movement.productId)).returning();
  await db.delete(movements).where(eq(movements.id, id));
  await undoSquareChange(movement, product);
  return product;
}
async function undoSquareChange(movement, product) {
  try {
    const queued = await db.select().from(squareOutbox).where(eq(squareOutbox.movementId, movement.id));
    if (queued.length === 0) return;
    const pending = queued.filter((r) => r.status === "pending");
    if (pending.length) await db.delete(squareOutbox).where(inArray(squareOutbox.id, pending.map((r) => r.id)));
    const sent = queued.find((r) => r.status === "sent");
    if (!sent || !product) return;
    await db.insert(squareOutbox).values(
      sent.kind === "count" ? { productId: product.id, variationId: sent.variationId, kind: "count", quantity: Math.max(0, product.qty) } : { productId: product.id, variationId: sent.variationId, kind: "delta", quantity: -sent.quantity }
    );
    await flushSquareSoon();
  } catch (error) {
    console.error("Could not undo Square change", error);
  }
}
async function mergeProductsInto(sourceId, targetId) {
  if (sourceId === targetId) throw new Error("Pick a different product to merge into.");
  const [source, target] = await Promise.all([findProductById(sourceId), findProductById(targetId)]);
  if (!source || !target) throw new Error("One of those products no longer exists.");
  if (source.squareVariationId && target.squareVariationId && source.squareVariationId !== target.squareVariationId) {
    throw new Error("Both products are linked to different Square items. Merge or fix them in Square first.");
  }
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
  const extraBarcodes = Array.from(/* @__PURE__ */ new Set([...target.extraBarcodes, ...codes]));
  const [merged] = await db.update(products).set({
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
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(products.id, targetId)).returning();
  if (merged?.squareVariationId && await squareConnected()) {
    await db.insert(squareOutbox).values({
      productId: merged.id,
      variationId: merged.squareVariationId,
      kind: "count",
      quantity: Math.max(0, merged.qty)
    });
    await flushSquareSoon();
  }
  return { product: merged, moved: carried.length };
}
async function deleteProductById(productId) {
  await db.delete(squareOutbox).where(and(eq(squareOutbox.productId, productId), eq(squareOutbox.status, "pending")));
  await db.delete(movements).where(eq(movements.productId, productId));
  const [row] = await db.delete(products).where(eq(products.id, productId)).returning();
  return row ?? null;
}
async function computeStats() {
  return stockStats(await db.select().from(products));
}
async function findBelowParProducts() {
  return selectBelowPar(await findAllProducts());
}
async function buildPurchaseOrderLines(requests) {
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
        unitCostCents: product.unitCostCents
      }
    ];
  });
}
async function countMovementsWithNote(note) {
  const [row] = await db.select({ n: sql`count(*)::int` }).from(movements).where(eq(movements.note, note));
  return row?.n ?? 0;
}
export {
  SQUARE_STAFF_NAME as S,
  findRecentMovements as a,
  findMovementsSince as b,
  computeStats as c,
  findProductByBarcode as d,
  findBarcodeOwner as e,
  findAllProducts as f,
  findProductById as g,
  applyMovement as h,
  insertProduct as i,
  updateProductFields as j,
  deleteProductById as k,
  findBelowParProducts as l,
  mergeProductsInto as m,
  buildPurchaseOrderLines as n,
  markPricesChecked as o,
  flushSquareSoon as p,
  findProductsByIds as q,
  reverseAndDeleteMovement as r,
  searchProductsByText as s,
  countMovementsWithNote as t,
  updateProductBarcode as u
};
