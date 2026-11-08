import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { purchaseOrderLines, purchaseOrders } from "../../db/schema.js";
import { findProductsByIds } from "./inventory.server.js";
import { applyImportLines } from "./import.server.js";
import { vendorGroupLabel, clampOrderQty } from "../lib/inventory-defaults.js";
import type { ImportLine, ImportSummary } from "../lib/bulk-import.js";
import type { DeliveryResult, OrdersOverview, SavedOrder, VendorScore } from "../lib/orders.js";

type OrderRow = typeof purchaseOrders.$inferSelect;
type LineRow = typeof purchaseOrderLines.$inferSelect;

function toSaved(order: OrderRow, lines: LineRow[]): SavedOrder {
  return {
    id: order.id,
    vendor: order.vendor,
    status: order.status as SavedOrder["status"],
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
      receivedCostCents: l.receivedCostCents,
    })),
  };
}

/**
 * Saves what staff just emailed, printed or downloaded as open purchase orders,
 * one per vendor, so the delivery can be checked in against it later.
 */
export async function saveOrders(params: {
  lines: { productId: number; qty: number }[];
  staffName: string;
  note: string;
  sentVia: string;
}): Promise<number[]> {
  const products = await findProductsByIds(params.lines.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<string, { productId: number; qty: number }[]>();
  for (const line of params.lines) {
    const product = byId.get(line.productId);
    if (!product) continue;
    const vendor = vendorGroupLabel(product).vendor;
    groups.set(vendor, [...(groups.get(vendor) ?? []), line]);
  }
  const ids: number[] = [];
  for (const [vendor, lines] of groups) {
    const [order] = await db
      .insert(purchaseOrders)
      .values({ vendor, note: params.note, staffName: params.staffName, sentVia: params.sentVia })
      .returning();
    await db.insert(purchaseOrderLines).values(
      lines.map((l) => {
        const p = byId.get(l.productId)!;
        return {
          orderId: order.id,
          productId: p.id,
          name: p.name,
          brand: p.brand,
          size: p.size,
          barcode: p.barcode,
          qtyOrdered: clampOrderQty(l.qty),
          unitCostCents: p.unitCostCents,
        };
      }),
    );
    ids.push(order.id);
  }
  return ids;
}

async function loadOrders(orders: OrderRow[]): Promise<SavedOrder[]> {
  if (orders.length === 0) return [];
  const lines = await db
    .select()
    .from(purchaseOrderLines)
    .where(
      inArray(
        purchaseOrderLines.orderId,
        orders.map((o) => o.id),
      ),
    )
    .orderBy(asc(purchaseOrderLines.name));
  return orders.map((o) => toSaved(o, lines.filter((l) => l.orderId === o.id)));
}

/**
 * Vendor accuracy from every order with a delivery checked in: share of ordered
 * units that arrived, lines whose invoice price differed from the ordered cost,
 * and average days from order to delivery.
 */
function scoreVendors(orders: SavedOrder[]): VendorScore[] {
  const byVendor = new Map<string, SavedOrder[]>();
  for (const o of orders) {
    if (o.status !== "partial" && o.status !== "received") continue;
    byVendor.set(o.vendor, [...(byVendor.get(o.vendor) ?? []), o]);
  }
  return [...byVendor.entries()]
    .map(([vendor, list]) => {
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
          days += (Date.parse(o.receivedAt) - Date.parse(o.createdAt)) / 86_400_000;
          dated++;
        }
      }
      return {
        vendor,
        orders: list.length,
        fillRate: ordered ? filled / ordered : 1,
        shortLines,
        priceChanges,
        avgDays: dated ? Math.round((days / dated) * 10) / 10 : null,
      };
    })
    .sort((a, b) => a.fillRate - b.fillRate);
}

/** Open and part-received orders, recent finished ones, units still on order per product, and vendor scores. */
export async function ordersOverview(): Promise<OrdersOverview> {
  const recent = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(200);
  const all = await loadOrders(recent);
  const open = all.filter((o) => o.status === "open" || o.status === "partial");
  const onOrder: Record<number, number> = {};
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
    vendors: scoreVendors(all),
  };
}

export async function cancelOrder(orderId: number) {
  await db.update(purchaseOrders).set({ status: "canceled" }).where(eq(purchaseOrders.id, orderId));
}

/**
 * Checks a delivery in: every line adds stock as a "receive" movement (so it
 * counts toward Budget and goes to Square), invoice costs update products, and
 * when it's for a saved order the order records what arrived and at what price.
 */
export async function receiveDelivery(params: {
  orderId: number | null;
  staffName: string;
  source: string;
  lines: Omit<ImportLine, "key" | "include" | "costSource" | "retailSource">[];
}): Promise<DeliveryResult> {
  const lines = params.lines.filter((l) => (l.qty ?? 0) > 0);
  const summary: ImportSummary = lines.length
    ? await applyImportLines({ mode: "receipt", staffName: params.staffName, source: params.source, lines })
    : { created: 0, updated: 0, priced: 0, units: 0 };

  if (!params.orderId) return { summary, status: null, short: [], priceChanges: [] };

  const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, params.orderId));
  if (!order) return { summary, status: null, short: [], priceChanges: [] };
  const orderLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.orderId, order.id));

  const arrived = new Map<number, { qty: number; cost: number }>();
  for (const l of lines) {
    if (!l.productId) continue;
    const prev = arrived.get(l.productId) ?? { qty: 0, cost: 0 };
    arrived.set(l.productId, { qty: prev.qty + (l.qty ?? 0), cost: l.unitCostCents || prev.cost });
  }

  const short: DeliveryResult["short"] = [];
  const priceChanges: DeliveryResult["priceChanges"] = [];
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
  await db.update(purchaseOrders).set({ status, receivedAt: new Date() }).where(eq(purchaseOrders.id, order.id));
  return { summary, status, short, priceChanges };
}
