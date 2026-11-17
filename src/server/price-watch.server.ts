/**
 * Price watch (server-only): reads the price history and hands it to buildPriceWatch
 * (src/lib/price-trends.ts), which holds all the arithmetic.
 */
import { and, asc, eq, gt, gte, inArray, notLike, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, priceHistory, products, purchaseOrderLines, purchaseOrders } from "../../db/schema.js";
import { buildPriceWatch } from "../lib/price-trends.js";
import { invoiceFixes, type Evidence } from "../lib/invoice-fixes.js";
import { updateProductFields } from "./inventory.server.js";
import { mine } from "./tenant.js";

export async function computePriceWatch(months: number) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [history, all, use] = await Promise.all([
    db.select().from(priceHistory).where(mine(priceHistory)).orderBy(asc(priceHistory.recordedAt)),
    db.select().from(products).where(mine(products)),
    db
      .select({ productId: movements.productId, out: sql<number>`coalesce(sum(-${movements.delta}), 0)::int` })
      .from(movements)
      .where(and(mine(movements), eq(movements.type, "out"), gte(movements.createdAt, since)))
      .groupBy(movements.productId),
  ]);
  const out = new Map(use.map((u) => [u.productId, Number(u.out)]));
  // Only prices an invoice or delivery actually charged for that product: typed guesses,
  // fixes and copies across a line would show corrections as inflation.
  const real = history.filter((h) => (h.source === "invoice" || h.source === "delivery") && !h.note.includes("same line as"));
  const watch = buildPriceWatch(
    real.map((h) => ({ productId: h.productId, cents: h.unitCostCents, at: h.recordedAt, vendor: h.vendor, source: h.source })),
    all.map((p) => ({ id: p.id, name: p.name, brand: p.brand, size: p.size, vendor: p.vendor, category: p.category, out30: out.get(p.id) ?? 0 })),
    new Date(),
    months,
  );
  const lastInvoice = history.filter((h) => h.source === "invoice" || h.source === "delivery").at(-1);
  return { ...watch, recorded: history.length, lastInvoiceAt: lastInvoice ? lastInvoice.recordedAt.toISOString() : null };
}

/** One product's whole cost history, newest first (for the Edit product sheet). */
export async function costHistory(productId: number) {
  const rows = await db
    .select()
    .from(priceHistory)
    .where(and(mine(priceHistory), eq(priceHistory.productId, productId)))
    .orderBy(asc(priceHistory.recordedAt));
  return rows
    .map((r) => ({ cents: r.unitCostCents, previousCents: r.previousCents, at: r.recordedAt.toISOString(), vendor: r.vendor, source: r.source, note: r.note }))
    .reverse();
}

/**
 * Prices that don't match what invoices charged, with the line following. Evidence:
 * price-history rows read from an invoice or delivery for that product (not ones copied
 * across a line), plus every delivery checked in against an order (its invoice cost).
 */
export async function priceFixes() {
  const [all, history, received] = await Promise.all([
    db.select().from(products).where(mine(products)),
    db
      .select()
      .from(priceHistory)
      .where(and(mine(priceHistory), inArray(priceHistory.source, ["invoice", "delivery"]), notLike(priceHistory.note, "%same line as%"))),
    db
      .select({
        productId: purchaseOrderLines.productId,
        cents: purchaseOrderLines.receivedCostCents,
        at: purchaseOrders.receivedAt,
        updated: purchaseOrders.createdAt,
        vendor: purchaseOrders.vendor,
      })
      .from(purchaseOrderLines)
      .innerJoin(purchaseOrders, and(eq(purchaseOrders.id, purchaseOrderLines.orderId), eq(purchaseOrders.businessId, purchaseOrderLines.businessId)))
      .where(and(mine(purchaseOrderLines), gt(purchaseOrderLines.receivedCostCents, 0))),
  ]);
  const evidence: Evidence[] = [
    ...history.map((h) => ({ productId: h.productId, cents: h.unitCostCents, at: h.recordedAt.toISOString(), vendor: h.vendor, from: h.source as "invoice" | "delivery" })),
    ...received.map((r) => ({ productId: r.productId, cents: r.cents, at: (r.at ?? r.updated).toISOString(), vendor: r.vendor, from: "delivery" as const })),
  ];
  const result = invoiceFixes(
    all.map((p) => ({ id: p.id, name: p.name, brand: p.brand, size: p.size, category: p.category, vendor: p.vendor, unitCostCents: p.unitCostCents })),
    evidence,
  );
  return { ...result, evidence: new Set(evidence.map((e) => e.productId)).size };
}

/** Applies ticked fixes; returns the old costs so the screen can undo. */
export async function applyPriceFixes(items: { productId: number; cents: number }[], undo = false) {
  const ids = items.map((i) => i.productId);
  if (ids.length === 0) return [];
  const rows = await db.select({ id: products.id, cost: products.unitCostCents }).from(products).where(and(mine(products), inArray(products.id, ids)));
  const before = new Map(rows.map((r) => [r.id, r.cost]));
  const out: { productId: number; cents: number }[] = [];
  for (const i of items) {
    if (!before.has(i.productId) || before.get(i.productId) === i.cents) continue;
    await updateProductFields(i.productId, { unitCostCents: i.cents }, { source: undo ? "manual" : "invoice-fix", note: undo ? "Undo fix from invoices" : "Fixed from invoices" });
    out.push({ productId: i.productId, cents: before.get(i.productId)! });
  }
  return out;
}
