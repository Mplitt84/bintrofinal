import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { approveCount, countLines, recentCounts } from "./counts.server.js";

/** Approves a reviewed count: adjusts stock with the reason and saves it to count history. */
export const approveStockCount = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      scope: z.string().max(120),
      blind: z.boolean(),
      staffName: z.string().max(60),
      lines: z
        .array(z.object({ productId: z.number().int().positive(), counted: z.number().int().min(0).max(100_000), reason: z.string().max(80) }))
        .min(1)
        .max(3000),
    }),
  )
  .handler(async ({ data }) => approveCount(data));

export const getCountHistory = createServerFn({ method: "GET" }).handler(async () => recentCounts());

export const getCountLines = createServerFn({ method: "POST" })
  .inputValidator(z.object({ countId: z.number().int().positive() }))
  .handler(async ({ data }) => countLines(data.countId));
