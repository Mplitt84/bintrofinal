import { r as requireUser } from "./auth.middleware-DMTTBk98.js";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { p as parseImportFile, a as applyImportLines, b as parseSalesReportFile, c as applySalesReport } from "./import.server-Cgs8xJ9L.js";
import { P as PRICE_BATCH, M as MAX_IMPORT_LINES, S as SALES_REPORT_APPS } from "./bulk-import-Bd6tmV71.js";
import { e as estimatePricesBatch } from "./product-lookup.server-C6LGgHTN.js";
import { a as findBusinessContext } from "./business.server-D8q61EIV.js";
import { d as assertFeature } from "./account.server-KWl-2NxD.js";
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
import "./inventory.server-CkpqsLFX.js";
import "./inventory-defaults-BnRHgx1T.js";
import "./business-types-DKNVcfJE.js";
const businessContext = findBusinessContext;
const parseImport_createServerFn_handler = createServerRpc({
  id: "1620febdb4067bb98e7d350594ac5c9c4eab48bbbcf9c68b5a33d1dc39131b6c",
  name: "parseImport",
  filename: "src/server/import.functions.ts"
}, (opts) => parseImport.__executeServer(opts));
const parseImport = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.discriminatedUnion("kind", [z.object({
  kind: z.literal("csv"),
  text: z.string().min(1).max(4e6)
}), z.object({
  kind: z.literal("document"),
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
})])).handler(parseImport_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  return parseImportFile(data, await businessContext());
});
const estimateImportPrices_createServerFn_handler = createServerRpc({
  id: "20bf5a75a4edbf48b80a16a026d0cb79a2129e64cd6f72053b979ac9b7e42f31",
  name: "estimateImportPrices",
  filename: "src/server/import.functions.ts"
}, (opts) => estimateImportPrices.__executeServer(opts));
const estimateImportPrices = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  items: z.array(z.object({
    name: z.string().max(200),
    brand: z.string().max(160),
    size: z.string().max(60),
    category: z.string().max(80)
  })).min(1).max(PRICE_BATCH)
})).handler(estimateImportPrices_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  return estimatePricesBatch(data.items, await businessContext());
});
const LineSchema = z.object({
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
const applyImport_createServerFn_handler = createServerRpc({
  id: "20025aaed2bc46dd8065664de0ce970c35cdc9ed6fdd8acc5179a688172eafce",
  name: "applyImport",
  filename: "src/server/import.functions.ts"
}, (opts) => applyImport.__executeServer(opts));
const applyImport = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  mode: z.enum(["inventory", "receipt", "prices"]),
  staffName: z.string().max(60),
  source: z.string().max(160),
  lines: z.array(LineSchema).min(1).max(MAX_IMPORT_LINES)
})).handler(applyImport_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  return applyImportLines(data);
});
const applyReceiptPrices_createServerFn_handler = createServerRpc({
  id: "e85c248ec3b804eb7e73c9e7df38322438247f357e6811aa2511e14b9c0d2d9b",
  name: "applyReceiptPrices",
  filename: "src/server/import.functions.ts"
}, (opts) => applyReceiptPrices.__executeServer(opts));
const applyReceiptPrices = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  staffName: z.string().max(60).optional()
})).handler(applyReceiptPrices_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  const parsed = await parseImportFile({
    kind: "document",
    data: data.data,
    mediaType: data.mediaType
  }, await businessContext());
  if (!parsed.ok) return {
    updated: 0,
    names: []
  };
  const lines = parsed.lines.filter((l) => l.productId && l.costSource === "document" && l.unitCostCents > 0);
  if (lines.length === 0) return {
    updated: 0,
    names: []
  };
  await applyImportLines({
    mode: "prices",
    staffName: data.staffName ?? "",
    source: `Receipt: ${parsed.vendor || "photo"}`,
    lines: lines.map((l) => ({
      ...l,
      retailPriceCents: 0
    }))
  });
  return {
    updated: lines.length,
    names: lines.slice(0, 5).map((l) => l.name)
  };
});
const FileSchema = z.discriminatedUnion("kind", [z.object({
  kind: z.literal("csv"),
  text: z.string().min(1).max(4e6)
}), z.object({
  kind: z.literal("document"),
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
})]);
const parseSalesReport_createServerFn_handler = createServerRpc({
  id: "bf70584d5b142e730fe2deaddb2a3ab4cbe99677bb068fc921318e35c498f523",
  name: "parseSalesReport",
  filename: "src/server/import.functions.ts"
}, (opts) => parseSalesReport.__executeServer(opts));
const parseSalesReport = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(FileSchema).handler(parseSalesReport_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  return parseSalesReportFile(data, await businessContext());
});
const logSalesReport_createServerFn_handler = createServerRpc({
  id: "04a3d82ebea9236975adab4fd578664123a041a305022b75d2336bb795ab8feb",
  name: "logSalesReport",
  filename: "src/server/import.functions.ts"
}, (opts) => logSalesReport.__executeServer(opts));
const logSalesReport = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  app: z.enum(SALES_REPORT_APPS),
  period: z.string().max(60),
  staffName: z.string().max(60),
  force: z.boolean(),
  lines: z.array(z.object({
    productId: z.number().int(),
    qty: z.number().int().min(1).max(1e5)
  })).min(1).max(MAX_IMPORT_LINES)
})).handler(logSalesReport_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("import");
  return applySalesReport(data);
});
export {
  applyImport_createServerFn_handler,
  applyReceiptPrices_createServerFn_handler,
  estimateImportPrices_createServerFn_handler,
  logSalesReport_createServerFn_handler,
  parseImport_createServerFn_handler,
  parseSalesReport_createServerFn_handler
};
