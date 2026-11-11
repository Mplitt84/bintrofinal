import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { computeProfit } from "./profit.server.js";

/** Profit page: money makers, money losers and data gaps for the last 30 / 90 / 365 days. */
export const getProfitReport = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .inputValidator(z.object({ days: z.union([z.literal(30), z.literal(90), z.literal(365)]) }))
  .handler(async ({ data }) => computeProfit(data.days));
