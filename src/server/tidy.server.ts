import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, parChanges, productCategories, products } from "../../db/schema.js";
import { applyImportLines } from "./import.server.js";
import { findAllProducts, updateProductFields } from "./inventory.server.js";
import { ordersOverview } from "./orders.server.js";
import { vendorGroupLabel } from "../lib/inventory-defaults.js";
import type { CategoryGroup, DuplicateGroup, Overstock, ParChangeSummary, ParSuggestion, SmartParResult } from "../lib/tidy.js";
import { findBusinessProfile } from "./business.server.js";

const DAY = 86_400_000;
/** Delivery time assumed until a vendor has deliveries checked in. */
const DEFAULT_LEAD_DAYS = 7;
/** Weeks of history used to measure how steady usage is. */
const WEEKS = 12;
/** Safety stock covers about 95% of weeks (z-score). */
const SERVICE_Z = 1.65;

/**
 * Smart par: the least stock that still never runs out, for small shops with
 * little shelf space and little cash.
 *
 * - Pace: units used or sold per day, weighted toward the last 30 days (65%) over 90 days (35%).
 * - Reorder at (par) = pace × the vendor's real delivery days + safety stock. Safety stock
 *   comes from how much weekly use swings (about 95% of weeks covered); with under 4 weeks of
 *   history it's half the delivery time's use.
 * - Order up to = par + pace × how often the business orders (`orderEveryDays`), rounded up to
 *   whole cases. Ordering fills back to this level, so stock stays lean between orders.
 * - Untouched for 90 days (and older than 30 days): par and order-up-to 0, so it stops alerting.
 * Overstock: products holding more than 1.5× their order-up-to level, with the cash tied up.
 */
export async function smartPars(): Promise<SmartParResult> {
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const sinceWeeks = new Date(now - WEEKS * 7 * DAY);
  const [all, usage, weekly, overview, profile] = await Promise.all([
    findAllProducts(),
    db
      .select({
        productId: movements.productId,
        used90: sql<number>`coalesce(sum(-${movements.delta}), 0)::int`,
        used30: sql<number>`coalesce(sum(case when ${movements.createdAt} >= ${since30} then -${movements.delta} else 0 end), 0)::int`,
      })
      .from(movements)
      .where(and(eq(movements.type, "out"), gte(movements.createdAt, since90)))
      .groupBy(movements.productId),
    db
      .select({
        productId: movements.productId,
        week: sql<number>`floor(extract(epoch from (now() - ${movements.createdAt})) / 604800)::int`,
        used: sql<number>`coalesce(sum(-${movements.delta}), 0)::int`,
      })
      .from(movements)
      .where(and(eq(movements.type, "out"), gte(movements.createdAt, sinceWeeks)))
      .groupBy(movements.productId, sql`2`),
    ordersOverview(),
    findBusinessProfile(),
  ]);
  const used = new Map(usage.map((u) => [u.productId, u]));
  const weeksByProduct = new Map<number, number[]>();
  for (const w of weekly) {
    if (w.week < 0 || w.week >= WEEKS) continue;
    const arr = weeksByProduct.get(w.productId) ?? new Array(WEEKS).fill(0);
    arr[w.week] = Math.max(0, w.used);
    weeksByProduct.set(w.productId, arr);
  }
  const leadByVendor = new Map(overview.vendors.filter((v) => v.avgDays !== null).map((v) => [v.vendor, v.avgDays!]));
  const cycle = Math.max(1, profile.orderEveryDays || 7);

  const suggestions: ParSuggestion[] = [];
  const overstock: Overstock[] = [];
  for (const p of all) {
    const u = used.get(p.id);
    const used30 = Math.max(0, u?.used30 ?? 0);
    const used90 = Math.max(0, u?.used90 ?? 0);
    const pack = Math.max(1, p.packSize || 1);
    const vendor = vendorGroupLabel(p).vendor;
    const knownLead = leadByVendor.get(vendor);
    const lead = Math.max(1, Math.round(knownLead ?? DEFAULT_LEAD_DAYS));
    const ageDays = (now - p.createdAt.getTime()) / DAY;

    let par: number;
    let max: number;
    let perDay = 0;
    let reason: string;
    if (used90 > 0) {
      perDay = used30 > 0 ? 0.65 * (used30 / 30) + 0.35 * (used90 / 90) : used90 / 90;
      // How much a week's use swings, over the weeks the product has existed (up to 12).
      const weeksKnown = Math.max(1, Math.min(WEEKS, Math.floor(ageDays / 7)));
      const series = (weeksByProduct.get(p.id) ?? new Array(WEEKS).fill(0)).slice(0, weeksKnown);
      const mean = series.reduce((a, b) => a + b, 0) / series.length;
      const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length);
      const safety = weeksKnown >= 4 ? SERVICE_Z * sd * Math.sqrt(lead / 7) : perDay * lead * 0.5;
      par = Math.max(1, Math.ceil(perDay * lead + safety));
      max = Math.ceil((par + perDay * cycle) / pack) * pack;
      if (max <= par) max = Math.ceil((par + 1) / pack) * pack;
      const steadiness = weeksKnown < 4 ? "new, extra cushion" : sd > mean ? "use swings a lot, extra cushion" : "steady";
      reason = `≈ ${perDay >= 1 ? perDay.toFixed(1) : perDay.toFixed(2)} a day · ${lead}-day delivery${knownLead ? ` from ${vendor}` : " (assumed)"} · ${steadiness}`;
    } else if (ageDays >= 30) {
      par = 0;
      max = 0;
      reason = "Not used in 90 days · stops alerting";
    } else {
      continue; // Too new to judge.
    }

    if (par !== p.reorderThreshold || max !== p.maxQty) {
      suggestions.push({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        size: p.size,
        current: p.reorderThreshold,
        suggested: par,
        currentMax: p.maxQty,
        suggestedMax: max,
        packSize: pack,
        perDay,
        reason,
      });
    }

    const onHand = Math.max(0, p.qty);
    if (perDay > 0 && max > 0 && onHand > max * 1.5) {
      overstock.push({
        productId: p.id,
        name: p.name,
        onHand,
        daysOfStock: Math.round(onHand / perDay),
        extraCents: (onHand - max) * p.unitCostCents,
      });
    }
  }
  suggestions.sort((a, b) => Number(a.suggested === 0) - Number(b.suggested === 0) || Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current) || b.perDay - a.perDay);
  overstock.sort((a, b) => b.extraCents - a.extraCents);
  return { suggestions, overstock: overstock.slice(0, 25), orderEveryDays: cycle, lastChange: await lastParChange() };
}

/**
 * Saves Smart par's levels and records each product's old and new levels under one
 * batch id, so the whole apply can be undone. Updates run a few at a time.
 */
export async function applyPars(items: { productId: number; par: number; max?: number }[], staffName = "") {
  if (items.length === 0) return { updated: 0, batchId: "" };
  const ids = items.map((i) => i.productId);
  const before = await db.select({ id: products.id, par: products.reorderThreshold, max: products.maxQty }).from(products).where(inArray(products.id, ids));
  const old = new Map(before.map((b) => [b.id, b]));
  const batchId = `par-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const rows = items
    .filter((i) => old.has(i.productId))
    .map((i) => ({
      batchId,
      productId: i.productId,
      oldPar: old.get(i.productId)!.par,
      oldMax: old.get(i.productId)!.max,
      newPar: i.par,
      newMax: i.max ?? old.get(i.productId)!.max,
      staffName: staffName.trim(),
    }));
  // History first, so an interrupted apply can still be undone for whatever changed.
  for (let i = 0; i < rows.length; i += 200) await db.insert(parChanges).values(rows.slice(i, i + 200));
  let updated = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10);
    await Promise.all(chunk.map((r) => updateProductFields(r.productId, { reorderThreshold: r.newPar, maxQty: r.newMax })));
    updated += chunk.length;
  }
  return { updated, batchId };
}

/** The latest Smart par apply that hasn't been undone, if any. */
export async function lastParChange(): Promise<ParChangeSummary | null> {
  const [latest] = await db
    .select({ batchId: parChanges.batchId, at: parChanges.createdAt, staffName: parChanges.staffName })
    .from(parChanges)
    .where(isNull(parChanges.undoneAt))
    .orderBy(desc(parChanges.createdAt), desc(parChanges.id))
    .limit(1);
  if (!latest) return null;
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(parChanges)
    .where(and(eq(parChanges.batchId, latest.batchId), isNull(parChanges.undoneAt)));
  return { batchId: latest.batchId, at: latest.at.toISOString(), products: n, staffName: latest.staffName };
}

/** Puts every product in one Smart par apply back to its levels from before it. */
export async function undoParChange(batchId: string) {
  const rows = await db
    .select()
    .from(parChanges)
    .where(and(eq(parChanges.batchId, batchId), isNull(parChanges.undoneAt)));
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows.slice(i, i + 10).map((r) => updateProductFields(r.productId, { reorderThreshold: r.oldPar, maxQty: r.oldMax }).catch(() => null)),
    );
  }
  await db.update(parChanges).set({ undoneAt: new Date() }).where(eq(parChanges.batchId, batchId));
  return { restored: rows.length };
}

/** "Floor bar back", "Floor Back bar " and "floor back-bar" all become "backbarfloor". */
export function categoryKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join("");
}

/** Spellings of the same category (across products and saved categories), largest first. */
export async function categoryGroups(): Promise<CategoryGroup[]> {
  const [counts, saved] = await Promise.all([
    db
      .select({ name: products.category, n: sql<number>`count(*)::int` })
      .from(products)
      .where(sql`${products.category} <> ''`)
      .groupBy(products.category),
    db.select({ name: productCategories.name }).from(productCategories),
  ]);
  const byName = new Map<string, number>();
  for (const c of counts) byName.set(c.name, c.n);
  for (const s of saved) if (!byName.has(s.name)) byName.set(s.name, 0);
  const groups = new Map<string, { name: string; products: number }[]>();
  for (const [name, n] of byName) {
    const key = categoryKey(name);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), { name, products: n }]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.sort((a, b) => b.products - a.products))
    .map((names) => ({ names, total: names.reduce((s, n) => s + n.products, 0) }))
    .sort((a, b) => b.total - a.total);
}

/** Renames every product in the `from` categories to `to` and removes the old saved spellings. */
export async function mergeCategoryNames(from: string[], to: string) {
  const target = to.trim();
  const others = from.filter((f) => f !== target);
  if (!target || others.length === 0) return 0;
  const moved = await db
    .update(products)
    .set({ category: target, updatedAt: new Date() })
    .where(inArray(products.category, others))
    .returning({ id: products.id });
  // Keep the tax group of the spelling being kept; drop the others.
  const saved = await db.select().from(productCategories);
  const keep = saved.find((c) => c.name === target);
  const donor = saved.find((c) => others.includes(c.name));
  if (!keep && donor) await db.insert(productCategories).values({ name: target, taxGroup: donor.taxGroup }).onConflictDoNothing();
  const drop = saved.filter((c) => others.includes(c.name)).map((c) => c.id);
  if (drop.length) await db.delete(productCategories).where(inArray(productCategories.id, drop));
  return moved.length;
}

function nameKey(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
function sizeKey(size: string) {
  return size.toLowerCase().replace(/[^0-9a-z.]/g, "");
}

/**
 * Likely duplicates: same product name, same size and same category spelling.
 * Retail and backbar copies of one product differ in size or category, so they
 * are never offered as duplicates.
 */
export async function duplicateGroups(): Promise<DuplicateGroup[]> {
  const all = await findAllProducts();
  const groups = new Map<string, typeof all>();
  for (const p of all) {
    const key = `${nameKey(p.name)}|${sizeKey(p.size)}|${categoryKey(p.category)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      products: g
        .sort((a, b) => Number(Boolean(b.squareVariationId)) - Number(Boolean(a.squareVariationId)) || b.qty - a.qty)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          size: p.size,
          category: p.category,
          vendor: p.vendor,
          qty: p.qty,
          barcode: p.barcode,
          linkedToSquare: Boolean(p.squareVariationId),
        })),
    }));
}

/** Stock count: sets each counted product to what's on the shelf (pulls Square sales first). */
export async function applyCounts(params: { staffName: string; counts: { productId: number; counted: number }[] }) {
  const ids = params.counts.map((c) => c.productId);
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const lines = params.counts
    .filter((c) => byId.has(c.productId))
    .map((c) => {
      const p = byId.get(c.productId)!;
      return {
        productId: p.id,
        barcode: p.barcode,
        name: p.name,
        brand: p.brand,
        size: p.size,
        category: p.category,
        vendor: p.vendor,
        qty: Math.max(0, Math.trunc(c.counted)),
        unitCostCents: 0,
        retailPriceCents: 0,
      };
    });
  if (lines.length === 0) return { created: 0, updated: 0, priced: 0, units: 0 };
  return applyImportLines({ mode: "inventory", staffName: params.staffName, source: "Stock count", lines });
}
