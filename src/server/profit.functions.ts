import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { computeProfit, excludeProfitRow, restoreProfitRow } from "./profit.server.js";
import { PROFIT_LIST_KEYS } from "../lib/profit.js";

/** Profit page: money makers, money losers and data gaps for the last 30 / 90 / 365 days. */
export const getProfitReport = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .inputValidator(z.object({ days: z.union([z.literal(30), z.literal(90), z.literal(365)]) }))
  .handler(async ({ data }) => computeProfit(data.days));

const rowInput = z.object({
  productId: z.number().int().positive(),
  key: z.enum(PROFIT_LIST_KEYS),
  staffName: z.string().max(80).default(""),
});

/** Remove a Profit row that is wrong; it leaves the list and the totals until put back. */
export const removeProfitRow = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(rowInput)
  .handler(async ({ data }) => excludeProfitRow(data.productId, data.key, data.staffName));

/** Put a removed Profit row back. */
export const putBackProfitRow = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(rowInput)
  .handler(async ({ data }) => restoreProfitRow(data.productId, data.key));
