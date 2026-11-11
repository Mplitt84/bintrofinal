/**
 * Profit page: which products make the business money and which cost it money.
 * Everything comes from Bintro's own records — no estimates:
 *  - sold units = `out` movements on "sold" products (scans, Square sales, sales report uploads)
 *  - profit = units × (retail price − cost) from the product's current prices
 *  - shrink = count corrections that lowered stock (adjust movements with a count reason)
 *  - cash tied up = on hand × cost for stock that isn't moving, is over Fill to, or has expired
 */
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, products, profitExclusions } from "../../db/schema.js";
import {
  findBusinessProfile,
  findProductCategories,
} from "./business.server.js";
import { useKindFor } from "./insights.server.js";
import { orderUpTo } from "../lib/inventory-defaults.js";
import { daysToExpiry } from "../lib/expiry.js";
import {
  DEAD_STOCK_DAYS,
  OVERSTOCK_RATIO,
  THIN_MARGIN_PCT,
  type MoneyLoser,
  type MoneyMaker,
  type ProductRef,
  type ProfitListKey,
  type ProfitPeriod,
  type ProfitReport,
  type ServiceCost,
} from "../lib/profit.js";

const DAY_MS = 86_400_000;
const money = (cents: number) => `$${(Math.round(cents) / 100).toFixed(2)}`;

/** Reason written on a count correction: "Count #12 · Damaged" → "Damaged". */
function countReason(note: string) {
  if (!/^Count #\d+/.test(note)) return null;
  return note.split("·").slice(1).join("·").trim() || "No reason given";
}

export async function computeProfit(
  days: ProfitPeriod,
  now = new Date(),
): Promise<ProfitReport> {
  const since = new Date(now.getTime() - days * DAY_MS);
  const deadSince = new Date(now.getTime() - DEAD_STOCK_DAYS * DAY_MS);

  const [all, categories, profile, outs, lastOut, counts, exclusions] = await Promise.all([
    db.select().from(products),
    findProductCategories(),
    findBusinessProfile(),
    db
      .select({
        productId: movements.productId,
        units: sql<number>`coalesce(sum(-${movements.delta}), 0)::int`,
      })
      .from(movements)
      .where(and(eq(movements.type, "out"), gte(movements.createdAt, since)))
      .groupBy(movements.productId),
    db
      .select({
        productId: movements.productId,
        at: sql<string>`max(${movements.createdAt})`,
      })
      .from(movements)
      .where(eq(movements.type, "out"))
      .groupBy(movements.productId),
    db
      .select({
        productId: movements.productId,
        delta: movements.delta,
        note: movements.note,
      })
      .from(movements)
      .where(
        and(
          eq(movements.type, "adjust"),
          gte(movements.createdAt, since),
          lt(movements.delta, 0),
        ),
      ),
    db.select().from(profitExclusions),
  ]);

  // Rows removed as incorrect: left off the lists and out of the totals.
  const excluded = new Set(exclusions.map((e) => `${e.productId}:${e.listKey}`));
  const ex = (id: number, key: ProfitListKey) => excluded.has(`${id}:${key}`);

  const unitsById = new Map(outs.map((o) => [o.productId, o.units]));
  const lastOutById = new Map(
    lastOut.map((o) => [o.productId, new Date(o.at)]),
  );
  const ref = (p: (typeof all)[number]): ProductRef => ({
    productId: p.id,
    name: p.name,
    brand: p.brand,
    size: p.size,
    vendor: p.vendor,
    imageUrl: p.imageUrl,
  });

  const makers: MoneyMaker[] = [];
  const losers: MoneyLoser[] = [];
  const serviceCosts: ServiceCost[] = [];
  const soldNoCost: ProductRef[] = [];
  const soldNoRetail: ProductRef[] = [];
  const totals = {
    revenueCents: 0,
    profitCents: 0,
    marginPct: 0,
    soldUnits: 0,
    usedCostCents: 0,
    shrinkCents: 0,
    deadStockCents: 0,
    overstockCents: 0,
    expiredCents: 0,
  };

  for (const p of all) {
    const kind = useKindFor(p, categories, profile.businessType);
    const units = Math.max(0, unitsById.get(p.id) ?? 0);
    const cost = p.unitCostCents;
    const retail = p.retailPriceCents;
    const onHand = Math.max(0, p.qty);

    if (kind === "sold" && units > 0) {
      if (!cost) soldNoCost.push(ref(p));
      if (!retail) soldNoRetail.push(ref(p));
      if (cost && retail && !ex(p.id, retail <= cost ? "loss" : "maker")) {
        const revenue = units * retail;
        const profit = units * (retail - cost);
        const marginPct = Math.round(((retail - cost) / retail) * 100);
        totals.revenueCents += revenue;
        totals.profitCents += profit;
        totals.soldUnits += units;
        if (profit > 0)
          makers.push({
            ...ref(p),
            units,
            revenueCents: revenue,
            costCents: units * cost,
            profitCents: profit,
            marginPct,
          });
        if (retail <= cost) {
          losers.push({
            ...ref(p),
            kind: "loss",
            amountCents: units * (cost - retail),
            why: `Sells for ${money(retail)} but costs you ${money(cost)}. You lost money on all ${units} sold.`,
            fix: "Raise the price or stop carrying it.",
          });
        } else if (marginPct < THIN_MARGIN_PCT && !ex(p.id, "thin")) {
          const target = Math.ceil(cost / (1 - THIN_MARGIN_PCT / 100));
          losers.push({
            ...ref(p),
            kind: "thin",
            // Money left on the table at a fair price.
            amountCents: units * (target - retail),
            why: `You keep only ${marginPct}% (${money(retail - cost)} each) after cost.`,
            fix: `A price of ${money(target)} would keep ${THIN_MARGIN_PCT}%.`,
          });
        }
      }
    }

    if (kind === "used" && units > 0 && cost && !ex(p.id, "service")) {
      totals.usedCostCents += units * cost;
      serviceCosts.push({ ...ref(p), units, costCents: units * cost });
    }

    if (!cost || onHand === 0) continue;
    const value = onHand * cost;

    const expiryDays = daysToExpiry(p.expiresOn, now);
    if (expiryDays !== null && expiryDays < 0) {
      if (ex(p.id, "expired")) continue;
      totals.expiredCents += value;
      losers.push({
        ...ref(p),
        kind: "expired",
        amountCents: value,
        why: `${onHand} on the shelf are past their date.`,
        fix: "Pull them, then count them out as Expired so the numbers stay right.",
      });
      continue;
    }
    if (expiryDays !== null && expiryDays <= 60 && onHand > 0 && !ex(p.id, "expiring")) {
      losers.push({
        ...ref(p),
        kind: "expiring",
        amountCents: value,
        why: `${onHand} expire in ${expiryDays} day${expiryDays === 1 ? "" : "s"}.`,
        fix:
          kind === "sold"
            ? "Put them on special or bundle them."
            : "Use these first.",
      });
    }

    const last = lastOutById.get(p.id);
    const oldEnough = p.createdAt < deadSince;
    if (oldEnough && (!last || last < deadSince)) {
      if (ex(p.id, "dead")) continue;
      totals.deadStockCents += value;
      losers.push({
        ...ref(p),
        kind: "dead",
        amountCents: value,
        why: last
          ? `Not ${kind === "sold" ? "sold" : "used"} since ${last.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. ${money(value)} is sitting on the shelf.`
          : `Never ${kind === "sold" ? "sold" : "used"} in Bintro. ${money(value)} is sitting on the shelf.`,
        fix:
          kind === "sold"
            ? "Mark it down, bundle it, or ask the vendor about a return."
            : "Stop reordering it, or check if staff use something else.",
      });
      continue;
    }

    // Only when the business has set a Fill to; the default par alone is too low a bar.
    const fillTo = p.maxQty > 0 ? orderUpTo(p) : 0;
    if (fillTo > 0 && onHand > fillTo * OVERSTOCK_RATIO && !ex(p.id, "overstock")) {
      const extra = onHand - fillTo;
      totals.overstockCents += extra * cost;
      losers.push({
        ...ref(p),
        kind: "overstock",
        amountCents: extra * cost,
        why: `${onHand} on hand but Fill to is ${fillTo}. ${extra} extra = ${money(extra * cost)} of cash on the shelf.`,
        fix: "Skip the next order for this one.",
      });
    }
  }

  // Shrink: count corrections that lowered stock, by reason.
  const byId = new Map(all.map((p) => [p.id, p]));
  const shrink = new Map<string, { units: number; costCents: number }>();
  const shrinkById = new Map<
    number,
    { units: number; costCents: number; reasons: Set<string> }
  >();
  for (const c of counts) {
    const reason = countReason(c.note);
    const p = byId.get(c.productId);
    if (!reason || !p || ex(p.id, "shrink")) continue;
    const units = -c.delta;
    const cents = units * p.unitCostCents;
    const r = shrink.get(reason) ?? { units: 0, costCents: 0 };
    shrink.set(reason, {
      units: r.units + units,
      costCents: r.costCents + cents,
    });
    const s = shrinkById.get(p.id) ?? {
      units: 0,
      costCents: 0,
      reasons: new Set<string>(),
    };
    s.units += units;
    s.costCents += cents;
    s.reasons.add(reason);
    shrinkById.set(p.id, s);
    totals.shrinkCents += cents;
  }
  for (const [id, s] of shrinkById) {
    const p = byId.get(id)!;
    if (!s.costCents) continue;
    losers.push({
      ...ref(p),
      kind: "shrink",
      amountCents: s.costCents,
      why: `${s.units} went missing or were lost in counts (${[...s.reasons].join(", ")}).`,
      fix: "Scan out every use and sale, and keep it where staff can see it.",
    });
  }

  totals.marginPct = totals.revenueCents
    ? Math.round((totals.profitCents / totals.revenueCents) * 100)
    : 0;

  return {
    days,
    totals,
    makers: makers.sort((a, b) => b.profitCents - a.profitCents).slice(0, 25),
    losers: losers.sort((a, b) => b.amountCents - a.amountCents).slice(0, 40),
    serviceCosts: serviceCosts
      .sort((a, b) => b.costCents - a.costCents)
      .slice(0, 10),
    shrinkByReason: [...shrink]
      .map(([reason, v]) => ({ reason, ...v }))
      .sort((a, b) => b.costCents - a.costCents),
    removed: exclusions
      .filter((e) => byId.has(e.productId))
      .map((e) => ({ ...ref(byId.get(e.productId)!), key: e.listKey as ProfitListKey })),
    gaps: {
      soldNoCost,
      soldNoRetail,
      neverCounted: all.filter((p) => !p.lastCountedAt).length,
      productsTotal: all.length,
    },
  };
}

/** Remove a row from the Profit page as incorrect (kept until it is put back). */
export async function excludeProfitRow(productId: number, key: ProfitListKey, staffName: string) {
  await db
    .insert(profitExclusions)
    .values({ productId, listKey: key, staffName })
    .onConflictDoNothing();
}

/** Put a removed row back on the Profit page. */
export async function restoreProfitRow(productId: number, key: ProfitListKey) {
  await db
    .delete(profitExclusions)
    .where(and(eq(profitExclusions.productId, productId), eq(profitExclusions.listKey, key)));
}
