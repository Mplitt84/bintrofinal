import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { computePriceWatch, costHistory } from "./price-watch.server.js";

export const getPriceWatch = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ months: z.union([z.literal(3), z.literal(6), z.literal(12), z.literal(24)]).default(12) }))
  .handler(async ({ data }) => computePriceWatch(data.months));

export const getCostHistory = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ productId: z.number().int().positive() }))
  .handler(async ({ data }) => costHistory(data.productId));
