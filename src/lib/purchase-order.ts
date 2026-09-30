/**
 * Client-safe purchase-order helpers. A purchase order is built by hand: staff tick
 * the flagged items they actually want to buy and adjust each quantity, so every
 * output (CSV, print sheet, email) is driven by the same selected lines.
 */
import { clampOrderQty, vendorGroupKey, vendorGroupLabel } from "./inventory-defaults.js";

/** One line of a staff-built purchase order: a flagged product plus the qty to order. */
export type PurchaseOrderLine = {
  productId: number;
  barcode: string;
  name: string;
  brand: string;
  vendor: string;
  size: string;
  category: string;
  qty: number;
  onHand: number;
  reorderThreshold: number;
  unitCostCents: number;
};

/** Lines that share a vendor + brand, ordered the way they print on the sheet. */
export type PurchaseOrderGroup = {
  key: string;
  vendor: string;
  brand: string;
  lines: PurchaseOrderLine[];
};

/** What a single line costs at its edited quantity. */
export function lineTotalCents(line: PurchaseOrderLine) {
  return clampOrderQty(line.qty) * line.unitCostCents;
}

/** Item / unit / dollar totals for whatever subset of lines is selected. */
export function purchaseOrderTotals(lines: PurchaseOrderLine[]) {
  return {
    itemCount: lines.length,
    unitCount: lines.reduce((sum, line) => sum + clampOrderQty(line.qty), 0),
    totalCents: lines.reduce((sum, line) => sum + lineTotalCents(line), 0),
  };
}

/**
 * Groups lines for display and for the printed/emailed order — one block per
 * vendor + brand, vendors alphabetical, products alphabetical inside each block.
 */
export function groupPurchaseOrderLines(lines: PurchaseOrderLine[]): PurchaseOrderGroup[] {
  const groups = new Map<string, PurchaseOrderGroup>();

  for (const line of lines) {
    const key = vendorGroupKey(line);
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(line);
    } else {
      const label = vendorGroupLabel(line);
      groups.set(key, { key, vendor: label.vendor, brand: label.brand, lines: [line] });
    }
  }

  const sorted = [...groups.values()].sort(
    (a, b) => a.vendor.localeCompare(b.vendor) || a.brand.localeCompare(b.brand),
  );
  for (const group of sorted) {
    group.lines.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

export const PURCHASE_ORDER_CSV_HEADERS = [
  "Vendor",
  "Brand",
  "Product",
  "Size",
  "Category",
  "Barcode",
  "On hand",
  "Par",
  "Order qty",
  "Unit cost",
  "Line total",
] as const;

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

/** The order as a spreadsheet: selected lines only, at their edited quantities. */
export function buildPurchaseOrderCsv(lines: PurchaseOrderLine[]) {
  const rows = groupPurchaseOrderLines(lines).flatMap((group) =>
    group.lines.map((line) => {
      const qty = clampOrderQty(line.qty);
      return [
        group.vendor,
        line.brand,
        line.name,
        line.size,
        line.category,
        line.barcode,
        line.onHand,
        line.reorderThreshold,
        qty,
        dollars(line.unitCostCents),
        dollars(qty * line.unitCostCents),
      ].map(csvCell).join(",");
    }),
  );

  const totals = purchaseOrderTotals(lines);
  return [
    PURCHASE_ORDER_CSV_HEADERS.join(","),
    ...rows,
    ["", "", `TOTAL (${totals.itemCount} items)`, "", "", "", "", "", totals.unitCount, "", dollars(totals.totalCents)]
      .map(csvCell)
      .join(","),
  ].join("\r\n");
}

/** e.g. `shag-noir-salon-purchase-order-2026-09-09.csv` */
export function purchaseOrderFilename(prefix = "bintro", date = new Date(), extension = "csv") {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `${prefix}-purchase-order-${stamp}.${extension}`;
}
