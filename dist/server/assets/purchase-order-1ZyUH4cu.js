import { h as vendorGroupKey, v as vendorGroupLabel, c as clampOrderQty } from "./inventory-defaults-BnRHgx1T.js";
function lineTotalCents(line) {
  return clampOrderQty(line.qty) * line.unitCostCents;
}
function purchaseOrderTotals(lines) {
  return {
    itemCount: lines.length,
    unitCount: lines.reduce((sum, line) => sum + clampOrderQty(line.qty), 0),
    totalCents: lines.reduce((sum, line) => sum + lineTotalCents(line), 0)
  };
}
function groupPurchaseOrderLines(lines) {
  const groups = /* @__PURE__ */ new Map();
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
    (a, b) => a.vendor.localeCompare(b.vendor) || a.brand.localeCompare(b.brand)
  );
  for (const group of sorted) {
    group.lines.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}
const PURCHASE_ORDER_CSV_HEADERS = [
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
  "Line total"
];
function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function dollars(cents) {
  return (cents / 100).toFixed(2);
}
function buildPurchaseOrderCsv(lines) {
  const rows = groupPurchaseOrderLines(lines).flatMap(
    (group) => group.lines.map((line) => {
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
        dollars(qty * line.unitCostCents)
      ].map(csvCell).join(",");
    })
  );
  const totals = purchaseOrderTotals(lines);
  return [
    PURCHASE_ORDER_CSV_HEADERS.join(","),
    ...rows,
    ["", "", `TOTAL (${totals.itemCount} items)`, "", "", "", "", "", totals.unitCount, "", dollars(totals.totalCents)].map(csvCell).join(",")
  ].join("\r\n");
}
function purchaseOrderFilename(prefix = "bintro", date = /* @__PURE__ */ new Date(), extension = "csv") {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
  return `${prefix}-purchase-order-${stamp}.${extension}`;
}
export {
  purchaseOrderTotals as a,
  buildPurchaseOrderCsv as b,
  groupPurchaseOrderLines as g,
  lineTotalCents as l,
  purchaseOrderFilename as p
};
