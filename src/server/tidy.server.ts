import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, productCategories, products } from "../../db/schema.js";
import { applyImportLines } from "./import.server.js";
import { findAllProducts, updateProductFields } from "./inventory.server.js";
import { ordersOverview } from "./orders.server.js";
import { vendorGroupLabel } from "../lib/inventory-defaults.js";
import type { CategoryGroup, DuplicateGroup, ParSuggestion } from "../lib/tidy.js";

const DAY = 86_400_000;
/** Days of stock kept on top of the vendor's delivery time. */
const BUFFER_DAYS = 7;
/** Delivery time assumed until a vendor has deliveries checked in. */
const DEFAULT_LEAD_DAYS = 7;

/**
 * Smart par: how much to keep so you never run out before the next delivery.
 * par = units used per day (last 30 days, else 90) × (the vendor's real delivery
 * days + a week's buffer). Items untouched for 90 days (and older than 30 days)
 * get par 0, so they stop crowding the below-par list.
 */
export async function smartPars(): Promise<ParSuggestion[]> {
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const [all, usage, overview] = await Promise.all([
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
    ordersOverview(),
  ]);
  const used = new Map(usage.map((u) => [u.productId, u]));
  const leadByVendor = new Map(overview.vendors.filter((v) => v.avgDays !== null).map((v) => [v.vendor, v.avgDays!]));

  const out: ParSuggestion[] = [];
  for (const p of all) {
    const u = used.get(p.id);
    const used30 = Math.max(0, u?.used30 ?? 0);
    const used90 = Math.max(0, u?.used90 ?? 0);
    const vendor = vendorGroupLabel(p).vendor;
    const knownLead = leadByVendor.get(vendor);
    const leadDays = Math.max(1, Math.round(knownLead ?? DEFAULT_LEAD_DAYS));
    const ageDays = (now - p.createdAt.getTime()) / DAY;
    let suggested: number;
    let reason: string;
    if (used30 > 0) {
      suggested = Math.max(1, Math.ceil((used30 / 30) * (leadDays + BUFFER_DAYS)));
      reason = `${used30} used in 30 days · ${leadDays}-day delivery${knownLead ? ` from ${vendor}` : ""} + 1 week`;
    } else if (used90 > 0) {
      suggested = Math.max(1, Math.ceil((used90 / 90) * (leadDays + BUFFER_DAYS)));
      reason = `${used90} used in 90 days · ${leadDays}-day delivery + 1 week`;
    } else if (ageDays >= 30) {
      suggested = 0;
      reason = "Not used in 90 days · no reorder alert";
    } else {
      continue; // Too new to judge.
    }
    if (suggested !== p.reorderThreshold) {
      out.push({ productId: p.id, name: p.name, brand: p.brand, size: p.size, current: p.reorderThreshold, suggested, reason });
    }
  }
  return out.sort((a, b) => Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current));
}

export async function applyPars(items: { productId: number; par: number }[]) {
  for (const item of items) await updateProductFields(item.productId, { reorderThreshold: item.par });
  return items.length;
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
