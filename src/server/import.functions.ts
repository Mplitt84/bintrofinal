import { requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyImportLines, applySalesReport, parseImportFile, parseSalesReportFile } from "./import.server.js";
import { SALES_REPORT_APPS } from "../lib/sales-report.js";
import { estimatePricesBatch } from "./product-lookup.server.js";
import { findBusinessContext } from "./business.server.js";
import { MAX_IMPORT_LINES, PRICE_BATCH } from "../lib/bulk-import.js";
import { assertFeature } from "./account.server.js";

const businessContext = findBusinessContext;

/** Reads an uploaded CSV, PDF or photo into reviewable line items matched to existing products. */
export const parseImport = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("csv"), text: z.string().min(1).max(4_000_000) }),
      z.object({
        kind: z.literal("document"),
        data: z.string().min(1).max(5_800_000),
        mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
      }),
    ]),
  )
  .handler(async ({ data }) => {
    await assertFeature("import");
    return parseImportFile(data, await businessContext());
  });

/** AI price estimates for a batch of import lines missing a cost or retail price. */
export const estimateImportPrices = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      items: z
        .array(
          z.object({
            name: z.string().max(200),
            brand: z.string().max(160),
            size: z.string().max(60),
            category: z.string().max(80),
          }),
        )
        .min(1)
        .max(PRICE_BATCH),
    }),
  )
  .handler(async ({ data }) => {
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
  qty: z.number().int().min(0).max(1_000_000).nullable(),
  unitCostCents: z.number().int().min(0).max(100_000_00),
  retailPriceCents: z.number().int().min(0).max(100_000_00),
});

/** Saves the reviewed import: new products, price updates and stock counts / receipts (prices only for a price list). */
export const applyImport = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      mode: z.enum(["inventory", "receipt", "prices"]),
      staffName: z.string().max(60),
      source: z.string().max(160),
      lines: z.array(LineSchema).min(1).max(MAX_IMPORT_LINES),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("import");
    return applyImportLines(data);
  });

/**
 * Any receipt or invoice photo keeps product costs current: reads its line items,
 * and for lines that match a product and show a unit price, updates that product's
 * cost (prices only — stock is left alone, so nothing is counted twice).
 */
export const applyReceiptPrices = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      data: z.string().min(1).max(5_800_000),
      mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
      staffName: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("import");
    const parsed = await parseImportFile({ kind: "document", data: data.data, mediaType: data.mediaType }, await businessContext());
    if (!parsed.ok) return { updated: 0, names: [] as string[] };
    const lines = parsed.lines.filter((l) => l.productId && l.costSource === "document" && l.unitCostCents > 0);
    if (lines.length === 0) return { updated: 0, names: [] as string[] };
    await applyImportLines({
      mode: "prices",
      staffName: data.staffName ?? "",
      source: `Receipt: ${parsed.vendor || "photo"}`,
      lines: lines.map((l) => ({ ...l, retailPriceCents: 0 })),
    });
    return { updated: lines.length, names: lines.slice(0, 5).map((l) => l.name) };
  });

const FileSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("csv"), text: z.string().min(1).max(4_000_000) }),
  z.object({
    kind: z.literal("document"),
    data: z.string().min(1).max(5_800_000),
    mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  }),
]);

/** Reads a product sales report exported from a booking app with no direct connection. */
export const parseSalesReport = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(FileSchema)
  .handler(async ({ data }) => {
    await assertFeature("import");
    return parseSalesReportFile(data, await businessContext());
  });

/** Logs the reviewed units sold as scan-outs, one per product, tagged with the app and period. */
export const logSalesReport = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      app: z.enum(SALES_REPORT_APPS),
      period: z.string().max(60),
      staffName: z.string().max(60),
      force: z.boolean(),
      lines: z
        .array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(100_000) }))
        .min(1)
        .max(MAX_IMPORT_LINES),
    }),
  )
  .handler(async ({ data }) => {
    await assertFeature("import");
    return applySalesReport(data);
  });
