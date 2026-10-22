/** Shared, client-safe inventory constants and helpers. */

/** On-hand count at or below which a product is flagged for restock. */
export const DEFAULT_REORDER_THRESHOLD = 2;

/** A product is below par once its on-hand count reaches its reorder threshold. */
export function isBelowPar(product: { qty: number; reorderThreshold: number }) {
  return product.qty <= product.reorderThreshold;
}

/** How many units it would take to get a product back to par. */
export function unitsToPar(product: { qty: number; reorderThreshold: number }) {
  return Math.max(0, product.reorderThreshold - product.qty);
}

/** Highest quantity a single purchase-order line may request. */
export const MAX_ORDER_QTY = 999;

/** Heading used when a product has neither a vendor nor a brand on file. */
export const UNASSIGNED_VENDOR_LABEL = "Unassigned";

/**
 * Units suggested for a purchase-order line. Mirrors the restock list: enough to
 * reach par, but never zero, so an at-par item still orders one unit.
 */
export function suggestedOrderQty(product: { qty: number; reorderThreshold: number }) {
  return unitsToPar(product) || 1;
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

type Stocked = { qty: number; reorderThreshold: number; name: string };

/**
 * Below-par products, worst shortfall first. Mirrors the server's
 * findBelowParProducts so the Restock tab can be derived from the same product
 * list the Products tab shows, and the two can never disagree.
 */
export function belowParOf<T extends Stocked>(all: T[]) {
  return all
    .filter(isBelowPar)
    .sort((a, b) => b.reorderThreshold - b.qty - (a.reorderThreshold - a.qty) || a.name.localeCompare(b.name));
}

/** Header numbers for the Products tab, computed from the product list itself. */
export function stockStats<T extends Stocked & { unitCostCents: number }>(all: T[]) {
  return {
    skuCount: all.length,
    totalItems: all.reduce((sum, p) => sum + p.qty, 0),
    lowStock: all.filter((p) => p.qty > 0 && p.qty <= p.reorderThreshold).length,
    outOfStock: all.filter((p) => p.qty <= 0).length,
    belowPar: all.filter(isBelowPar).length,
    totalValueCents: all.reduce((sum, p) => sum + p.qty * p.unitCostCents, 0),
  };
}
