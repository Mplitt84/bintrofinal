import { r as requireUser } from "./auth.middleware-2uPScvPU.js";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { s as saveOrders, o as ordersOverview, c as cancelOrder, r as receiveDelivery } from "./orders.server-DgNHBrCe.js";
import { d as assertFeature } from "./account.server-Dnxw0Aoe.js";
import { M as MAX_IMPORT_LINES } from "./bulk-import-Bd6tmV71.js";
import { M as MAX_ORDER_QTY } from "./inventory-defaults-BnRHgx1T.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:crypto";
import "drizzle-orm";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "./inventory.server-DdbWwcaj.js";
import "./import.server-C4q-t60R.js";
import "./product-lookup.server-C6LGgHTN.js";
const saveSentOrder_createServerFn_handler = createServerRpc({
  id: "dd1d8a58bbc30e8a725bc36307dceba1dd9bf6b9019d1c90affe42d2e63539e3",
  name: "saveSentOrder",
  filename: "src/server/orders.functions.ts"
}, (opts) => saveSentOrder.__executeServer(opts));
const saveSentOrder = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    qty: z.number().int().positive().max(MAX_ORDER_QTY)
  })).min(1).max(MAX_IMPORT_LINES),
  staffName: z.string().max(60),
  note: z.string().max(500),
  sentVia: z.enum(["email", "print", "csv"])
})).handler(saveSentOrder_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("orders");
  return saveOrders(data);
});
const getOrders_createServerFn_handler = createServerRpc({
  id: "f07945f68743a5a7d6c010091d42d30bd9a75215321a513ae562b81c0f674590",
  name: "getOrders",
  filename: "src/server/orders.functions.ts"
}, (opts) => getOrders.__executeServer(opts));
const getOrders = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getOrders_createServerFn_handler, async () => {
  return ordersOverview();
});
const cancelSavedOrder_createServerFn_handler = createServerRpc({
  id: "b51509cfb38ef861d7d9c37a0e23bafbfd2120e92db5cadd0f0564ea6c62aef1",
  name: "cancelSavedOrder",
  filename: "src/server/orders.functions.ts"
}, (opts) => cancelSavedOrder.__executeServer(opts));
const cancelSavedOrder = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  orderId: z.number().int().positive()
})).handler(cancelSavedOrder_createServerFn_handler, async ({
  data
}) => {
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
  qty: z.number().int().min(0).max(1e6).nullable(),
  unitCostCents: z.number().int().min(0).max(1e7),
  retailPriceCents: z.number().int().min(0).max(1e7)
});
const receiveDeliveryFn_createServerFn_handler = createServerRpc({
  id: "c14f2e2425a97dd2b7fe28324db104a92512246cd40a47f2918e9adcd6661d1d",
  name: "receiveDeliveryFn",
  filename: "src/server/orders.functions.ts"
}, (opts) => receiveDeliveryFn.__executeServer(opts));
const receiveDeliveryFn = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  orderId: z.number().int().positive().nullable(),
  staffName: z.string().max(60),
  source: z.string().max(160),
  lines: z.array(DeliveryLine).min(1).max(MAX_IMPORT_LINES)
})).handler(receiveDeliveryFn_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("orders");
  return receiveDelivery(data);
});
export {
  cancelSavedOrder_createServerFn_handler,
  getOrders_createServerFn_handler,
  receiveDeliveryFn_createServerFn_handler,
  saveSentOrder_createServerFn_handler
};
