const DEFAULT_REORDER_THRESHOLD = 2;
function onHandQty(product) {
  const qty = Number(product.qty);
  return Number.isFinite(qty) ? Math.trunc(qty) : 0;
}
function reorderPoint(product) {
  const point = Number(product.reorderThreshold);
  return Number.isFinite(point) && point > 0 ? Math.trunc(point) : 0;
}
const STOCK_STATUS_LABEL = { out: "Out", low: "Low", in: "In stock" };
function stockStatus(product) {
  const qty = onHandQty(product);
  if (qty <= 0) return "out";
  const point = reorderPoint(product);
  return point > 0 && qty <= point ? "low" : "in";
}
function isBelowPar(product) {
  return stockStatus(product) !== "in";
}
function unitsToPar(product) {
  return Math.max(0, reorderPoint(product) - onHandQty(product));
}
function selectBelowPar(products) {
  return products.filter(isBelowPar).sort(
    (a, b) => reorderPoint(b) - onHandQty(b) - (reorderPoint(a) - onHandQty(a)) || a.name.localeCompare(b.name)
  );
}
const MAX_ORDER_QTY = 999;
const UNASSIGNED_VENDOR_LABEL = "Unassigned";
function casePack(product) {
  const n = Number(product.packSize);
  return Number.isFinite(n) && n > 1 ? Math.trunc(n) : 1;
}
function orderUpTo(product) {
  const max = Number(product.maxQty);
  const par = reorderPoint(product);
  return Number.isFinite(max) && max > 0 ? Math.max(Math.trunc(max), par) : par;
}
function suggestedOrderQty(product, onOrder = 0) {
  const pack = casePack(product);
  const need = orderUpTo(product) - Math.max(0, onHandQty(product)) - Math.max(0, onOrder);
  if (need <= 0) return onOrder > 0 ? 0 : pack;
  return Math.max(1, Math.floor(need / pack)) * pack;
}
function clampOrderQty(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ORDER_QTY, Math.max(1, Math.trunc(value)));
}
function vendorGroupKey(product) {
  const vendor = (product.vendor ?? "").trim().toLowerCase();
  const brand = (product.brand ?? "").trim().toLowerCase();
  return `${vendor}|${brand}`;
}
function vendorGroupLabel(product) {
  const vendor = (product.vendor ?? "").trim();
  const brand = (product.brand ?? "").trim();
  return {
    vendor: vendor || brand || UNASSIGNED_VENDOR_LABEL,
    brand: vendor && brand ? brand : ""
  };
}
function deriveInitials(staffName) {
  return staffName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}
function stockStats(all) {
  return {
    skuCount: all.length,
    totalItems: all.reduce((sum, p) => sum + Math.max(0, onHandQty(p)), 0),
    lowStock: all.filter((p) => stockStatus(p) === "low").length,
    outOfStock: all.filter((p) => stockStatus(p) === "out").length,
    belowPar: all.filter(isBelowPar).length,
    totalValueCents: all.reduce((sum, p) => sum + onHandQty(p) * p.unitCostCents, 0)
  };
}
export {
  DEFAULT_REORDER_THRESHOLD as D,
  MAX_ORDER_QTY as M,
  STOCK_STATUS_LABEL as S,
  stockStats as a,
  selectBelowPar as b,
  clampOrderQty as c,
  deriveInitials as d,
  stockStatus as e,
  orderUpTo as f,
  casePack as g,
  vendorGroupKey as h,
  isBelowPar as i,
  onHandQty as o,
  suggestedOrderQty as s,
  unitsToPar as u,
  vendorGroupLabel as v
};
