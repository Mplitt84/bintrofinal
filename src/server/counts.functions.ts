import { requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { approveCount, countLines, countWithLines, recentCounts, undoCount } from "./counts.server.js";

/** Approves a reviewed count: adjusts stock with the reason and saves it to count history. */
export const approveStockCount = createServerFn({ method: "POST" }).middleware([requireUser])
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

export const getCountHistory = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => recentCounts());

export const getCountLines = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ countId: z.number().int().positive() }))
  .handler(async ({ data }) => countLines(data.countId));

/** One count with its lines (for a Count row in Recent). */
export const getCount = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ countId: z.number().int().positive() }))
  .handler(async ({ data }) => countWithLines(data.countId));

/** Reverses a whole count (every product it changed) and marks it undone. */
export const undoStockCount = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ countId: z.number().int().positive(), staffName: z.string().max(60) }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await undoCount(data.countId, data.staffName)) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn't undo that count." };
    }
  });
