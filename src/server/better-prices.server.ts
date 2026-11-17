/**
 * Better prices (server-only): the weekly scan for cheaper sellers, the offers it keeps,
 * and switching a product to a cheaper seller. Rules live in src/lib/better-prices.ts;
 * the web search is findCheaperSellers in product-lookup.server.ts.
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { movements, priceAlternatives, products } from "../../db/schema.js";
import {
  SCAN_PER_WEEK,
  isBuyingPreference,
  marketplaceAllowed,
  monthlySaving,
  pickScanQueue,
  worthSwitching,
  type BetterPrice,
  type BetterPricesState,
  type BuyingPreference,
  type SellerType,
} from "../lib/better-prices.js";
import { businessTypeById } from "../lib/business-types.js";
import { categorySuggestionsFor, guessTaxGroup } from "../lib/tax-categories.js";
import { findBusinessProfile, findProductCategories } from "./business.server.js";
import { updateProductFields } from "./inventory.server.js";
import { findCheaperSellers } from "./product-lookup.server.js";
import { mine, owned } from "./tenant.js";

/** Units out per product in the last 30 days. */
async function usage30() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select({ productId: movements.productId, out: sql<number>`coalesce(sum(-${movements.delta}), 0)::int` })
    .from(movements)
    .where(and(mine(movements), eq(movements.type, "out"), gte(movements.createdAt, since)))
    .groupBy(movements.productId);
  return new Map(rows.map((r) => [r.productId, Number(r.out)]));
}

/** "2511 E 6th St, Suite D, Austin, TX 78702" → "Austin, TX". */
export function cityFromAddress(address: string) {
  const m = /([A-Za-z .'-]+),\s*([A-Z]{2})\b/.exec(address.split(/,\s*(?:suite|ste|unit|#)[^,]*/i).join(""));
  return m ? `${m[1].trim().split(/\s{2,}/).pop()}, ${m[2]}` : "";
}

async function preference(): Promise<{ pref: BuyingPreference; type: string; city: string }> {
  const profile = await findBusinessProfile();
  return {
    pref: isBuyingPreference(profile.buyingPreference) ? profile.buyingPreference : "pro",
    type: profile.businessType,
    city: cityFromAddress(profile.address),
  };
}

export async function betterPricesState(): Promise<BetterPricesState> {
  const [{ pref }, rows, all, use] = await Promise.all([
    preference(),
    db
      .select()
      .from(priceAlternatives)
      .where(and(mine(priceAlternatives), eq(priceAlternatives.status, "new")))
      .orderBy(desc(priceAlternatives.foundAt)),
    db.select().from(products).where(mine(products)),
    usage30(),
  ]);
  const byId = new Map(all.map((p) => [p.id, p]));
  const offers: BetterPrice[] = [];
  for (const r of rows) {
    const p = byId.get(r.productId);
    if (!p) continue;
    // Compare with today's cost: if it already dropped below the offer, the offer is moot.
    const current = p.unitCostCents || r.currentCostCents;
    if (!worthSwitching(current, r.unitCostCents)) continue;
    const out30 = use.get(p.id) ?? 0;
    offers.push({
      id: r.id,
      productId: p.id,
      productName: p.name,
      brand: p.brand,
      size: p.size,
      category: p.category,
      currentVendor: p.vendor || r.currentVendor,
      currentCostCents: current,
      sellerName: r.sellerName,
      sellerUrl: r.sellerUrl,
      sellerType: r.sellerType as SellerType,
      unitCostCents: r.unitCostCents,
      savingPerUnitCents: current - r.unitCostCents,
      savingPct: Math.round(((current - r.unitCostCents) / current) * 100),
      monthlySavingCents: monthlySaving(current, r.unitCostCents, out30),
      out30,
      note: r.note,
      foundAt: r.foundAt.toISOString(),
    });
  }
  // Best offer per product first, biggest monthly saving first.
  offers.sort((a, b) => b.monthlySavingCents - a.monthlySavingCents || b.savingPerUnitCents - a.savingPerUnitCents);
  const best = new Map<number, number>();
  for (const o of offers) best.set(o.productId, Math.max(best.get(o.productId) ?? 0, o.monthlySavingCents));
  const lastScan = all.reduce<Date | null>((m, p) => (p.sellerScanAt && (!m || p.sellerScanAt > m) ? p.sellerScanAt : m), null);
  const weekAgo = Date.now() - 7 * 86_400_000;
  return {
    preference: pref,
    offers,
    monthlySavingCents: [...best.values()].reduce((s, v) => s + v, 0),
    lastScanAt: lastScan ? lastScan.toISOString() : null,
    checkedThisWeek: all.filter((p) => p.sellerScanAt && p.sellerScanAt.getTime() > weekAgo).length,
    missingCost: all.filter((p) => p.unitCostCents <= 0).length,
  };
}

/**
 * Checks up to `limit` products for cheaper sellers (biggest spend first, nothing
 * re-checked within RESCAN_DAYS). Each product's open offers are replaced by what this
 * run found; switched and dismissed ones stay as the record.
 */
export async function runPriceScan(limit = SCAN_PER_WEEK) {
  const [{ pref, type, city }, all, use, saved] = await Promise.all([
    preference(),
    db.select().from(products).where(mine(products)),
    usage30(),
    findProductCategories(),
  ]);
  const queue = pickScanQueue(
    all.map((p) => ({ id: p.id, name: p.name, unitCostCents: p.unitCostCents, out30: use.get(p.id) ?? 0, sellerScanAt: p.sellerScanAt })),
    new Date(),
    limit,
  );
  const byId = new Map(all.map((p) => [p.id, p]));
  const businessType = businessTypeById(type);
  const suggestions = categorySuggestionsFor(type);
  // Offers the shop already turned down aren't offered again.
  const dismissed = await db
    .select({ productId: priceAlternatives.productId, sellerName: priceAlternatives.sellerName })
    .from(priceAlternatives)
    .where(and(mine(priceAlternatives), eq(priceAlternatives.status, "dismissed")));
  const no = new Set(dismissed.map((d) => `${d.productId}|${d.sellerName.toLowerCase()}`));

  let checked = 0;
  let found = 0;
  let failed = 0;
  for (let i = 0; i < queue.length; i += 2) {
    const batch = queue.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (c) => {
        const p = byId.get(c.id)!;
        const group = guessTaxGroup(p.category, suggestions, saved);
        const res = await findCheaperSellers(
          { brand: p.brand, name: p.name, size: p.size, vendor: p.vendor, barcode: p.barcode, unitCostCents: p.unitCostCents },
          { businessType: type, itemNoun: businessType.itemNoun, local: pref === "local", city, allowMarketplace: marketplaceAllowed(pref, group) },
        );
        return { p, res };
      }),
    );
    for (const { p, res } of results) {
      if (!res.ok) {
        failed++;
        continue;
      }
      checked++;
      await db
        .delete(priceAlternatives)
        .where(and(mine(priceAlternatives), eq(priceAlternatives.productId, p.id), eq(priceAlternatives.status, "new")));
      const keep = res.offers.filter((o) => worthSwitching(p.unitCostCents, o.unitCostCents) && !no.has(`${p.id}|${o.sellerName.toLowerCase()}`));
      if (keep.length) {
        await db.insert(priceAlternatives).values(
          keep.map((o) => ({
            ...owned(),
            productId: p.id,
            sellerName: o.sellerName,
            sellerUrl: o.sellerUrl,
            sellerType: o.sellerType,
            unitCostCents: o.unitCostCents,
            currentCostCents: p.unitCostCents,
            currentVendor: p.vendor,
            note: o.note,
          })),
        );
        found += keep.length;
      }
      await db.update(products).set({ sellerScanAt: new Date() }).where(and(mine(products), eq(products.id, p.id)));
    }
    // The AI service is down: stop rather than burn through the list.
    if (failed >= 2 && checked === 0) break;
  }
  return { checked, found, failed, waiting: queue.length - checked - failed };
}

/** Switch: the product's supplier and cost become the offer's. Returns the old values for Undo. */
export async function switchToOffer(id: number, staffName: string) {
  const [offer] = await db.select().from(priceAlternatives).where(and(mine(priceAlternatives), eq(priceAlternatives.id, id)));
  if (!offer) throw new Error("That offer is gone. Refresh and try again.");
  const [p] = await db.select().from(products).where(and(mine(products), eq(products.id, offer.productId)));
  if (!p) throw new Error("That product was deleted.");
  await updateProductFields(p.id, { vendor: offer.sellerName, unitCostCents: offer.unitCostCents });
  await db
    .update(priceAlternatives)
    .set({ status: "switched", decidedAt: new Date(), decidedBy: staffName })
    .where(and(mine(priceAlternatives), eq(priceAlternatives.id, id)));
  // The other offers for this product were compared with the old supplier; let the next scan redo them.
  await db
    .update(priceAlternatives)
    .set({ status: "dismissed", decidedAt: new Date(), decidedBy: "replaced" })
    .where(and(mine(priceAlternatives), eq(priceAlternatives.productId, p.id), eq(priceAlternatives.status, "new")));
  return { productId: p.id, vendor: p.vendor, unitCostCents: p.unitCostCents };
}

export async function undoSwitch(id: number, before: { productId: number; vendor: string; unitCostCents: number }) {
  await updateProductFields(before.productId, { vendor: before.vendor, unitCostCents: before.unitCostCents });
  await db
    .update(priceAlternatives)
    .set({ status: "new", decidedAt: null, decidedBy: "" })
    .where(and(mine(priceAlternatives), inArray(priceAlternatives.id, [id])));
}

export async function setOfferStatus(id: number, status: "dismissed" | "new", staffName: string) {
  await db
    .update(priceAlternatives)
    .set({ status, decidedAt: status === "new" ? null : new Date(), decidedBy: status === "new" ? "" : staffName })
    .where(and(mine(priceAlternatives), eq(priceAlternatives.id, id)));
}
