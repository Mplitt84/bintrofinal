import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { applyPriceFixes, computePriceWatch, costHistory, priceFixes } from "./price-watch.server.js";

export const getPriceWatch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ months: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(12) }))
  .handler(async ({ data }) => computePriceWatch(data.months));

export const getCostHistory = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ productId: z.number().int().positive() }))
  .handler(async ({ data }) => costHistory(data.productId));

export const getPriceFixes = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => priceFixes());

export const applyPriceFixesFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      items: z.array(z.object({ productId: z.number().int().positive(), cents: z.number().int().min(0).max(10_000_000) })).min(1).max(2000),
      undo: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => applyPriceFixes(data.items, data.undo));
