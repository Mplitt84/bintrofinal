import { and, gte, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, products } from "../../db/schema.js";
import type { Overview, OverviewBucket, OverviewTopItem, OverviewTotals } from "../lib/overview.js";
import { findBusinessProfile, findProductCategories } from "./business.server.js";
import { useKindFor } from "./insights.server.js";

const empty = (): OverviewTotals => ({
  soldUnits: 0,
  soldCents: 0,
  soldUnpriced: 0,
  usedUnits: 0,
  usedCents: 0,
  receivedUnits: 0,
  receivedCents: 0,
  counts: 0,
  countNetUnits: 0,
  countNetCents: 0,
});

/**
 * Scan page overview: what sold, was used, came in and was corrected by counts
 * in [start, end), compared with [prevStart, prevEnd), plus chart buckets
 * (edges from the client so they follow local time) and the top items.
 */
export async function computeOverview(w: { start: Date; end: Date; prevStart: Date; prevEnd: Date; edges: Date[]; labels: string[] }): Promise<Overview> {
  const [all, categories, profile, rows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        imageUrl: products.imageUrl,
        category: products.category,
        retailPriceCents: products.retailPriceCents,
        unitCostCents: products.unitCostCents,
      })
      .from(products),
    findProductCategories(),
    findBusinessProfile(),
    db
      .select({ productId: movements.productId, type: movements.type, delta: movements.delta, createdAt: movements.createdAt })
      .from(movements)
      .where(and(gte(movements.createdAt, w.prevStart < w.start ? w.prevStart : w.start), lt(movements.createdAt, w.end))),
  ]);

  const byId = new Map(all.map((p) => [p.id, { ...p, kind: useKindFor(p, categories, profile.businessType) }]));
  const current = empty();
  const previous = empty();
  const buckets: OverviewBucket[] = w.labels.map((label) => ({ label, soldUnits: 0, usedUnits: 0, receivedUnits: 0, soldCents: 0, usedCents: 0 }));
  const top = new Map<number, OverviewTopItem>();

  for (const m of rows) {
    const p = byId.get(m.productId);
    if (!p) continue;
    const t = m.createdAt.getTime();
    const inCurrent = t >= w.start.getTime() && t < w.end.getTime();
    const inPrevious = t >= w.prevStart.getTime() && t < w.prevEnd.getTime();
    if (!inCurrent && !inPrevious) continue;
    const totals = inCurrent ? current : previous;
    const bucket = inCurrent ? buckets[w.edges.findIndex((e, i) => i < w.edges.length - 1 && t >= e.getTime() && t < w.edges[i + 1].getTime())] : undefined;

    if (m.type === "out") {
      const units = -m.delta;
      if (p.kind === "sold") {
        totals.soldUnits += units;
        totals.soldCents += units * p.retailPriceCents;
        if (!p.retailPriceCents) totals.soldUnpriced += units;
        if (bucket) {
          bucket.soldUnits += units;
          bucket.soldCents += units * p.retailPriceCents;
        }
      } else {
        totals.usedUnits += units;
        totals.usedCents += units * p.unitCostCents;
        if (bucket) {
          bucket.usedUnits += units;
          bucket.usedCents += units * p.unitCostCents;
        }
      }
      if (inCurrent) {
        const item = top.get(p.id) ?? {
          productId: p.id,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          kind: p.kind,
          units: 0,
          cents: 0,
        };
        item.units += units;
        item.cents += units * (p.kind === "sold" ? p.retailPriceCents : p.unitCostCents);
        top.set(p.id, item);
      }
    } else if (m.type === "in" || m.type === "receive") {
      totals.receivedUnits += m.delta;
      totals.receivedCents += m.delta * p.unitCostCents;
      if (bucket) bucket.receivedUnits += m.delta;
    } else if (m.type === "adjust") {
      totals.counts += 1;
      totals.countNetUnits += m.delta;
      totals.countNetCents += m.delta * p.unitCostCents;
    }
  }

  return {
    current,
    previous,
    buckets,
    top: [...top.values()]
      .filter((i) => i.units > 0)
      .sort((a, b) => b.units - a.units || b.cents - a.cents)
      .slice(0, 5),
    soldIds: [...byId.values()].filter((p) => p.kind === "sold").map((p) => p.id),
  };
}
