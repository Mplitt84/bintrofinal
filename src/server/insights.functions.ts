import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { InsightKind, WebPriceResult, WebPriceSource } from "../lib/insights.js";
import { findBusinessContext } from "./business.server.js";
import { ensureInsightSummary, findInsights, findPriceCheck, insertPriceCheck, runInsightReport } from "./insights.server.js";
import { findProductById, markPricesChecked } from "./inventory.server.js";
import { findWebPrice } from "./product-lookup.server.js";
import { hasFeature } from "./account.server.js";

const KindSchema = z.enum(["weekly", "monthly", "fast"]);

export const getInsights = createServerFn({ method: "GET" }).handler(async () => {
  return findInsights();
});

/** AI summary for a pop-up; writes one for the current period if the scheduled report hasn't yet. */
export const getInsightSummary = createServerFn({ method: "POST" })
  .inputValidator(z.object({ kind: KindSchema }))
  .handler(async ({ data }) => {
    return { summary: await ensureInsightSummary(data.kind as InsightKind) };
  });

/** Settings → Reports & alerts → Send now. */
export const sendInsightReportNow = createServerFn({ method: "POST" })
  .inputValidator(z.object({ kind: KindSchema }))
  .handler(async ({ data }) => {
    if (!(await hasFeature("insights"))) {
      return { ok: false as const, message: "Sales reports are part of Bintro Plus. Upgrade in Settings → Account & billing." };
    }
    const run = await runInsightReport(data.kind as InsightKind, { force: true });
    if (!run.email) {
      return { ok: false as const, message: "Nothing to report yet — Bintro needs more scans for this report." };
    }
    return run.email.ok
      ? { ok: true as const, message: `Sent to ${run.email.to}.` }
      : { ok: false as const, message: run.email.message };
  });

const PriceFieldsSchema = z.object({
  productId: z.number().int().positive().optional(),
  name: z.string().max(200).default(""),
  brand: z.string().max(120).default(""),
  size: z.string().max(60).default(""),
  category: z.string().max(80).default(""),
  vendor: z.string().max(120).default(""),
  barcode: z.string().max(64).default(""),
});

/**
 * Looks up the price on the manufacturer's site, an authorised distributor or
 * Amazon (never third-party resale listings). Saved products keep a record of each check.
 */
export const checkWebPrice = createServerFn({ method: "POST" })
  .inputValidator(PriceFieldsSchema)
  .handler(async ({ data }): Promise<WebPriceResult> => {
    if (!(await hasFeature("ai"))) {
      return { ok: false, message: "AI price checks are part of Bintro Plus. Upgrade in Settings → Account & billing." };
    }
    let fields = { name: data.name, brand: data.brand, size: data.size, category: data.category, vendor: data.vendor, barcode: data.barcode };
    if (data.productId) {
      const product = await findProductById(data.productId);
      if (!product) return { ok: false, message: "That product no longer exists." };
      fields = {
        name: data.name || product.name,
        brand: data.brand || product.brand,
        size: data.size || product.size,
        category: data.category || product.category,
        vendor: data.vendor || product.vendor,
        barcode: data.barcode || product.barcode,
      };
    }
    const business = await findBusinessContext();
    const r = await findWebPrice(fields, business);
    if (!r.ok) return r;
    const checkId = data.productId
      ? (
          await insertPriceCheck({
            productId: data.productId,
            unitCostCents: r.unitCostCents,
            retailPriceCents: r.retailPriceCents,
            sourceName: r.sourceName,
            sourceUrl: r.sourceUrl,
            sourceType: r.sourceType,
            note: r.note,
          })
        ).id
      : 0;
    return { ...r, checkId, sourceType: r.sourceType as WebPriceSource };
  });

/** Applies prices (from a web check or typed) and marks the product's prices as current. */
export const applyWebPrice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      productId: z.number().int().positive(),
      checkId: z.number().int().nonnegative().optional(),
      unitCostCents: z.number().int().nonnegative().max(10_000_000).optional(),
      retailPriceCents: z.number().int().nonnegative().max(10_000_000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    let prices = { unitCostCents: data.unitCostCents, retailPriceCents: data.retailPriceCents };
    if (data.checkId) {
      const check = await findPriceCheck(data.checkId);
      if (check && check.productId === data.productId) {
        prices = {
          unitCostCents: prices.unitCostCents ?? (check.unitCostCents || undefined),
          retailPriceCents: prices.retailPriceCents ?? (check.retailPriceCents || undefined),
        };
      }
    }
    const product = await markPricesChecked(data.productId, prices);
    if (!product) throw new Error("That product no longer exists.");
    return product;
  });

/** "Price still right": keeps the prices and resets the reminder clock. */
export const confirmPrices = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const product = await markPricesChecked(data.productId);
    if (!product) throw new Error("That product no longer exists.");
    return product;
  });
