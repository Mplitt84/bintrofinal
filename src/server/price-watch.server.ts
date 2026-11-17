/**
 * Price watch (server-only): reads the price history and hands it to buildPriceWatch
 * (src/lib/price-trends.ts), which holds all the arithmetic.
 */
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, priceHistory, products } from "../../db/schema.js";
import { buildPriceWatch } from "../lib/price-trends.js";
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
  const watch = buildPriceWatch(
    history.map((h) => ({ productId: h.productId, cents: h.unitCostCents, at: h.recordedAt, vendor: h.vendor, source: h.source })),
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
