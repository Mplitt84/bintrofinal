import { r as requireUser } from "./auth.middleware-C_30RReI.js";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { a as findBusinessContext } from "./business.server-DvuZq3pz.js";
import { f as findInsights, e as ensureInsightSummary, r as runInsightReport, i as insertPriceCheck, a as findPriceCheck } from "./insights.server-COwLS2Ls.js";
import { g as findProductById, o as markPricesChecked } from "./inventory.server-Bvd4T4SM.js";
import { f as findWebPrice } from "./product-lookup.server-C6LGgHTN.js";
import { a as hasFeature } from "./account.server-CmQFc2Bw.js";
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
import "./business-types-DKNVcfJE.js";
import "./insights-BQ2QJiNr.js";
import "./email.server-2uKsRAsj.js";
import "./inventory-defaults-BnRHgx1T.js";
import "./purchase-order-1ZyUH4cu.js";
const KindSchema = z.enum(["weekly", "monthly", "fast"]);
const getInsights_createServerFn_handler = createServerRpc({
  id: "08ccd14865d516fb455ca8ecc85f1226b605386556c7d4af3e3f54106e04aeb3",
  name: "getInsights",
  filename: "src/server/insights.functions.ts"
}, (opts) => getInsights.__executeServer(opts));
const getInsights = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getInsights_createServerFn_handler, async () => {
  return findInsights();
});
const getInsightSummary_createServerFn_handler = createServerRpc({
  id: "b0755821f285543af9317e907f849527e2025919870fab838916fc903fd55bdc",
  name: "getInsightSummary",
  filename: "src/server/insights.functions.ts"
}, (opts) => getInsightSummary.__executeServer(opts));
const getInsightSummary = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  kind: KindSchema
})).handler(getInsightSummary_createServerFn_handler, async ({
  data
}) => {
  return {
    summary: await ensureInsightSummary(data.kind)
  };
});
const sendInsightReportNow_createServerFn_handler = createServerRpc({
  id: "8a5cdce2e3594cdbb1763bc5ca5a423c0e06b3456788d6a0864c260d8d214b84",
  name: "sendInsightReportNow",
  filename: "src/server/insights.functions.ts"
}, (opts) => sendInsightReportNow.__executeServer(opts));
const sendInsightReportNow = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  kind: KindSchema
})).handler(sendInsightReportNow_createServerFn_handler, async ({
  data
}) => {
  if (!await hasFeature("insights")) {
    return {
      ok: false,
      message: "Sales reports are part of Bintro Plus. Upgrade in Settings → Account & billing."
    };
  }
  const run = await runInsightReport(data.kind, {
    force: true
  });
  if (!run.email) {
    return {
      ok: false,
      message: "Nothing to report yet — Bintro needs more scans for this report."
    };
  }
  return run.email.ok ? {
    ok: true,
    message: `Sent to ${run.email.to}.`
  } : {
    ok: false,
    message: run.email.message
  };
});
const PriceFieldsSchema = z.object({
  productId: z.number().int().positive().optional(),
  name: z.string().max(200).default(""),
  brand: z.string().max(120).default(""),
  size: z.string().max(60).default(""),
  category: z.string().max(80).default(""),
  vendor: z.string().max(120).default(""),
  barcode: z.string().max(64).default("")
});
const checkWebPrice_createServerFn_handler = createServerRpc({
  id: "6a3e722c6decd120d655deff6e327fd1bb25f2de144af22924707b3586e10156",
  name: "checkWebPrice",
  filename: "src/server/insights.functions.ts"
}, (opts) => checkWebPrice.__executeServer(opts));
const checkWebPrice = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(PriceFieldsSchema).handler(checkWebPrice_createServerFn_handler, async ({
  data
}) => {
  if (!await hasFeature("ai")) {
    return {
      ok: false,
      message: "AI price checks are part of Bintro Plus. Upgrade in Settings → Account & billing."
    };
  }
  let fields = {
    name: data.name,
    brand: data.brand,
    size: data.size,
    category: data.category,
    vendor: data.vendor,
    barcode: data.barcode
  };
  if (data.productId) {
    const product = await findProductById(data.productId);
    if (!product) return {
      ok: false,
      message: "That product no longer exists."
    };
    fields = {
      name: data.name || product.name,
      brand: data.brand || product.brand,
      size: data.size || product.size,
      category: data.category || product.category,
      vendor: data.vendor || product.vendor,
      barcode: data.barcode || product.barcode
    };
  }
  const business = await findBusinessContext();
  const r = await findWebPrice(fields, business);
  if (!r.ok) return r;
  const checkId = data.productId ? (await insertPriceCheck({
    productId: data.productId,
    unitCostCents: r.unitCostCents,
    retailPriceCents: r.retailPriceCents,
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl,
    sourceType: r.sourceType,
    note: r.note
  })).id : 0;
  return {
    ...r,
    checkId,
    sourceType: r.sourceType
  };
});
const applyWebPrice_createServerFn_handler = createServerRpc({
  id: "9177352979bdd25707a8e28d888613648e8d2c1f2e94ce02c00f6c99b6afb802",
  name: "applyWebPrice",
  filename: "src/server/insights.functions.ts"
}, (opts) => applyWebPrice.__executeServer(opts));
const applyWebPrice = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productId: z.number().int().positive(),
  checkId: z.number().int().nonnegative().optional(),
  unitCostCents: z.number().int().nonnegative().max(1e7).optional(),
  retailPriceCents: z.number().int().nonnegative().max(1e7).optional()
})).handler(applyWebPrice_createServerFn_handler, async ({
  data
}) => {
  let prices = {
    unitCostCents: data.unitCostCents,
    retailPriceCents: data.retailPriceCents
  };
  if (data.checkId) {
    const check = await findPriceCheck(data.checkId);
    if (check && check.productId === data.productId) {
      prices = {
        unitCostCents: prices.unitCostCents ?? (check.unitCostCents || void 0),
        retailPriceCents: prices.retailPriceCents ?? (check.retailPriceCents || void 0)
      };
    }
  }
  const product = await markPricesChecked(data.productId, prices);
  if (!product) throw new Error("That product no longer exists.");
  return product;
});
const confirmPrices_createServerFn_handler = createServerRpc({
  id: "8dd7a7a2cddcfe3bde69e3b6a2141d3a9ad49f42632f598e1f6b54be9a908306",
  name: "confirmPrices",
  filename: "src/server/insights.functions.ts"
}, (opts) => confirmPrices.__executeServer(opts));
const confirmPrices = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  productId: z.number().int().positive()
})).handler(confirmPrices_createServerFn_handler, async ({
  data
}) => {
  const product = await markPricesChecked(data.productId);
  if (!product) throw new Error("That product no longer exists.");
  return product;
});
export {
  applyWebPrice_createServerFn_handler,
  checkWebPrice_createServerFn_handler,
  confirmPrices_createServerFn_handler,
  getInsightSummary_createServerFn_handler,
  getInsights_createServerFn_handler,
  sendInsightReportNow_createServerFn_handler
};
