import { desc, inArray, asc, eq } from "drizzle-orm";
import { d as db, j as purchaseOrders, k as purchaseOrderLines } from "./index-nBnBfwCa.js";
import { q as findProductsByIds } from "./inventory.server-NFwTD6ZI.js";
import { a as applyImportLines } from "./import.server-4TeCEbNX.js";
import { v as vendorGroupLabel, c as clampOrderQty } from "./inventory-defaults-BnRHgx1T.js";
function toSaved(order, lines) {
  return {
    id: order.id,
    vendor: order.vendor,
    status: order.status,
    note: order.note,
    staffName: order.staffName,
    sentVia: order.sentVia,
    createdAt: order.createdAt.toISOString(),
    receivedAt: order.receivedAt?.toISOString() ?? null,
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      name: l.name,
      brand: l.brand,
      size: l.size,
      barcode: l.barcode,
      qtyOrdered: l.qtyOrdered,
      qtyReceived: l.qtyReceived,
      unitCostCents: l.unitCostCents,
      receivedCostCents: l.receivedCostCents
    }))
  };
}
async function saveOrders(params) {
  const products = await findProductsByIds(params.lines.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = /* @__PURE__ */ new Map();
  for (const line of params.lines) {
    const product = byId.get(line.productId);
    if (!product) continue;
    const vendor = vendorGroupLabel(product).vendor;
    groups.set(vendor, [...groups.get(vendor) ?? [], line]);
  }
  const ids = [];
  for (const [vendor, lines] of groups) {
    const [order] = await db.insert(purchaseOrders).values({ vendor, note: params.note, staffName: params.staffName, sentVia: params.sentVia }).returning();
    await db.insert(purchaseOrderLines).values(
      lines.map((l) => {
        const p = byId.get(l.productId);
        return {
          orderId: order.id,
          productId: p.id,
          name: p.name,
          brand: p.brand,
          size: p.size,
          barcode: p.barcode,
          qtyOrdered: clampOrderQty(l.qty),
          unitCostCents: p.unitCostCents
        };
      })
    );
    ids.push(order.id);
  }
  return ids;
}
async function loadOrders(orders) {
  if (orders.length === 0) return [];
  const lines = await db.select().from(purchaseOrderLines).where(
    inArray(
      purchaseOrderLines.orderId,
      orders.map((o) => o.id)
    )
  ).orderBy(asc(purchaseOrderLines.name));
  return orders.map((o) => toSaved(o, lines.filter((l) => l.orderId === o.id)));
}
function scoreVendors(orders) {
  const byVendor = /* @__PURE__ */ new Map();
  for (const o of orders) {
    if (o.status !== "partial" && o.status !== "received") continue;
    byVendor.set(o.vendor, [...byVendor.get(o.vendor) ?? [], o]);
  }
  return [...byVendor.entries()].map(([vendor, list]) => {
    let ordered = 0;
    let filled = 0;
    let priceChanges = 0;
    let shortLines = 0;
    let days = 0;
    let dated = 0;
    for (const o of list) {
      for (const l of o.lines) {
        ordered += l.qtyOrdered;
        filled += Math.min(l.qtyReceived, l.qtyOrdered);
        if (l.qtyReceived < l.qtyOrdered) shortLines++;
        if (l.receivedCostCents > 0 && l.unitCostCents > 0 && l.receivedCostCents !== l.unitCostCents) priceChanges++;
      }
      if (o.receivedAt) {
        days += (Date.parse(o.receivedAt) - Date.parse(o.createdAt)) / 864e5;
        dated++;
      }
    }
    return {
      vendor,
      orders: list.length,
      fillRate: ordered ? filled / ordered : 1,
      shortLines,
      priceChanges,
      avgDays: dated ? Math.round(days / dated * 10) / 10 : null
    };
  }).sort((a, b) => a.fillRate - b.fillRate);
}
async function ordersOverview() {
  const recent = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(200);
  const all = await loadOrders(recent);
  const open = all.filter((o) => o.status === "open" || o.status === "partial");
  const onOrder = {};
  for (const o of open) {
    for (const l of o.lines) {
      const left = Math.max(0, l.qtyOrdered - l.qtyReceived);
      if (left) onOrder[l.productId] = (onOrder[l.productId] ?? 0) + left;
    }
  }
  return {
    open,
    done: all.filter((o) => o.status === "received").slice(0, 15),
    onOrder,
    vendors: scoreVendors(all)
  };
}
async function cancelOrder(orderId) {
  await db.update(purchaseOrders).set({ status: "canceled" }).where(eq(purchaseOrders.id, orderId));
}
async function receiveDelivery(params) {
  const lines = params.lines.filter((l) => (l.qty ?? 0) > 0);
  const summary = lines.length ? await applyImportLines({ mode: "receipt", staffName: params.staffName, source: params.source, lines }) : { created: 0, updated: 0, priced: 0, units: 0 };
  if (!params.orderId) return { summary, status: null, short: [], priceChanges: [] };
  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, params.orderId));
  if (!order) return { summary, status: null, short: [], priceChanges: [] };
  const orderLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.orderId, order.id));
  const arrived = /* @__PURE__ */ new Map();
  for (const l of lines) {
    if (!l.productId) continue;
    const prev = arrived.get(l.productId) ?? { qty: 0, cost: 0 };
    arrived.set(l.productId, { qty: prev.qty + (l.qty ?? 0), cost: l.unitCostCents || prev.cost });
  }
  const short = [];
  const priceChanges = [];
  let complete = true;
  for (const l of orderLines) {
    const got = arrived.get(l.productId);
    const qtyReceived = l.qtyReceived + (got?.qty ?? 0);
    const receivedCostCents = got?.cost || l.receivedCostCents;
    if (got) {
      await db.update(purchaseOrderLines).set({ qtyReceived, receivedCostCents }).where(eq(purchaseOrderLines.id, l.id));
    }
    if (qtyReceived < l.qtyOrdered) {
      complete = false;
      short.push({ name: l.name, ordered: l.qtyOrdered, received: qtyReceived });
    }
    if (got?.cost && l.unitCostCents && got.cost !== l.unitCostCents) {
      priceChanges.push({ name: l.name, fromCents: l.unitCostCents, toCents: got.cost });
    }
  }
  const status = complete ? "received" : "partial";
  await db.update(purchaseOrders).set({ status, receivedAt: /* @__PURE__ */ new Date() }).where(eq(purchaseOrders.id, order.id));
  return { summary, status, short, priceChanges };
}
export {
  cancelOrder as c,
  ordersOverview as o,
  receiveDelivery as r,
  saveOrders as s
};
