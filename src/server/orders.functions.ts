import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cancelOrder, ordersOverview, receiveDelivery, saveOrders } from "./orders.server.js";
import { assertFeature } from "./account.server.js";
import { MAX_IMPORT_LINES } from "../lib/bulk-import.js";
import { MAX_ORDER_QTY } from "../lib/inventory-defaults.js";

/** Saves an emailed / printed / downloaded order as open purchase orders, one per vendor. */
export const saveSentOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      lines: z
        .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().positive().max(MAX_ORDER_QTY) }))
        .min(1)
        .max(MAX_IMPORT_LINES),
      staffName: z.string().max(60),
      note: z.string().max(500),
      sentVia: z.enum(["email", "print", "csv"]),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("orders");
    return saveOrders(data);
  });

export const getOrders = createServerFn({ method: "GET" }).handler(async () => {
  return ordersOverview();
});

export const cancelSavedOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await assertFeature("orders");
    await cancelOrder(data.orderId);
    return ordersOverview();
  });

const DeliveryLine = z.object({
  productId: z.number().int().nullable(),
  barcode: z.string().max(60),
  name: z.string().max(200),
  brand: z.string().max(160),
  size: z.string().max(60),
  category: z.string().max(80),
  vendor: z.string().max(120),
  qty: z.number().int().min(0).max(1_000_000).nullable(),
  unitCostCents: z.number().int().min(0).max(100_000_00),
  retailPriceCents: z.number().int().min(0).max(100_000_00),
});

/** Checks a delivery in: adds stock, updates costs and, for a saved order, records what arrived. */
export const receiveDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.number().int().positive().nullable(),
      staffName: z.string().max(60),
      source: z.string().max(160),
      lines: z.array(DeliveryLine).min(1).max(MAX_IMPORT_LINES),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("orders");
    return receiveDelivery(data);
  });
