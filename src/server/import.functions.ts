import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyImportLines, parseImportFile } from "./import.server.js";
import { estimatePricesBatch } from "./product-lookup.server.js";
import { findBusinessContext } from "./business.server.js";
import { MAX_IMPORT_LINES, PRICE_BATCH } from "../lib/bulk-import.js";
import { assertFeature } from "./account.server.js";

const businessContext = findBusinessContext;

/** Reads an uploaded CSV, PDF or photo into reviewable line items matched to existing products. */
export const parseImport = createServerFn({ method: "POST" })
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
export const estimateImportPrices = createServerFn({ method: "POST" })
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
export const applyImport = createServerFn({ method: "POST" })
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
