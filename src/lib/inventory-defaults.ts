/** Shared, client-safe inventory constants and helpers. */

/** On-hand count at or below which a product is flagged for restock. */
export const DEFAULT_REORDER_THRESHOLD = 2;

type StockLevels = {
  qty: number | null | undefined;
  reorderThreshold: number | null | undefined;
  /** "Order up to" level; 0 or missing = order back to par. */
  maxQty?: number | null;
  /** Units per case; orders round up to whole cases. */
  packSize?: number | null;
};

/** On-hand count as a whole number; a blank or missing quantity counts as 0. */
export function onHandQty(product: { qty: number | null | undefined }) {
  const qty = Number(product.qty);
  return Number.isFinite(qty) ? Math.trunc(qty) : 0;
}

/** Reorder point as a whole number; blank or missing means the product has none (0). */
export function reorderPoint(product: { reorderThreshold: number | null | undefined }) {
  const point = Number(product.reorderThreshold);
  return Number.isFinite(point) && point > 0 ? Math.trunc(point) : 0;
}

export type StockStatus = "out" | "low" | "in";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = { out: "Out", low: "Low", in: "In stock" };

/**
 * The one rule every screen and email uses:
 * - Out: nothing on hand (0, blank, or below zero after over-scanning)
 * - Low: 1 or more on hand, but at or under the product's reorder point
 * - In stock: above the reorder point. A product with no reorder point is never Low.
 */
export function stockStatus(product: StockLevels): StockStatus {
  const qty = onHandQty(product);
  if (qty <= 0) return "out";
  const point = reorderPoint(product);
  return point > 0 && qty <= point ? "low" : "in";
}

/** A product needs restocking once it is Out or Low. */
export function isBelowPar(product: StockLevels) {
  return stockStatus(product) !== "in";
}

/** How many units it would take to get a product back to par. */
export function unitsToPar(product: StockLevels) {
  return Math.max(0, reorderPoint(product) - onHandQty(product));
}

/**
 * Products that need restocking, worst shortfall first. Restock, the restock email and
 * the tab badge all derive from the same product rows through this, so they never disagree.
 */
export function selectBelowPar<T extends StockLevels & { name: string }>(products: T[]): T[] {
  return products
    .filter(isBelowPar)
    .sort(
      (a, b) =>
        reorderPoint(b) - onHandQty(b) - (reorderPoint(a) - onHandQty(a)) || a.name.localeCompare(b.name),
    );
}

/** Highest quantity a single purchase-order line may request. */
export const MAX_ORDER_QTY = 999;

/** Heading used when a product has neither a vendor nor a brand on file. */
export const UNASSIGNED_VENDOR_LABEL = "Unassigned";

/** Units per case (at least 1). */
export function casePack(product: { packSize?: number | null }) {
  const n = Number(product.packSize);
  return Number.isFinite(n) && n > 1 ? Math.trunc(n) : 1;
}

/** The level an order fills back up to: "Order up to" when set (never below par), else par. */
export function orderUpTo(product: StockLevels) {
  const max = Number(product.maxQty);
  const par = reorderPoint(product);
  return Number.isFinite(max) && max > 0 ? Math.max(Math.trunc(max), par) : par;
}

/**
 * Units suggested for a purchase-order line: enough to fill back up to "Order up to"
 * (or par), minus anything already on an open order, in whole cases. Rounds *down* to
 * whole cases so the shelf never goes past "Order up to" (small spaces, tight cash),
 * but always at least one case. Returns 0 when open orders already cover it.
 */
export function suggestedOrderQty(product: StockLevels, onOrder = 0) {
  const pack = casePack(product);
  const need = orderUpTo(product) - Math.max(0, onHandQty(product)) - Math.max(0, onOrder);
  if (need <= 0) return onOrder > 0 ? 0 : pack;
  return Math.max(1, Math.floor(need / pack)) * pack;
}

/** Keeps a hand-typed order quantity a whole number within 1..MAX_ORDER_QTY. */
export function clampOrderQty(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ORDER_QTY, Math.max(1, Math.trunc(value)));
}

type VendorGrouped = { vendor?: string; brand?: string };

/**
 * Purchase orders group by vendor *and* brand: one distributor can supply several
 * brands, and each brand is ordered as its own line group. Products with no vendor
 * on file group under their brand alone.
 */
export function vendorGroupKey(product: VendorGrouped) {
  const vendor = (product.vendor ?? "").trim().toLowerCase();
  const brand = (product.brand ?? "").trim().toLowerCase();
  return `${vendor}|${brand}`;
}

/** Group heading parts: vendor name as the title, brand as the sub-line. */
export function vendorGroupLabel(product: VendorGrouped) {
  const vendor = (product.vendor ?? "").trim();
  const brand = (product.brand ?? "").trim();
  return {
    vendor: vendor || brand || UNASSIGNED_VENDOR_LABEL,
    brand: vendor && brand ? brand : "",
  };
}

/** "Dita Von Teese" -> "DV". Keeps the legacy initials column populated. */
export function deriveInitials(staffName: string) {
  return staffName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Header numbers for the Products tab, computed from the product list with the same Out / Low rule. */
export function stockStats<T extends StockLevels & { unitCostCents: number }>(all: T[]) {
  return {
    skuCount: all.length,
    totalItems: all.reduce((sum, p) => sum + Math.max(0, onHandQty(p)), 0),
    lowStock: all.filter((p) => stockStatus(p) === "low").length,
    outOfStock: all.filter((p) => stockStatus(p) === "out").length,
    belowPar: all.filter(isBelowPar).length,
    totalValueCents: all.reduce((sum, p) => sum + onHandQty(p) * p.unitCostCents, 0),
  };
}
