import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { computeReport } from "./reports.server.js";

const When = z.string().datetime({ offset: true }).or(z.string().datetime());

/** The Reports screen for one period. Windows and chart edges follow the device's clock. */
export const getReport = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      period: z.enum(["today", "week", "month", "quarter", "year"]),
      start: When,
      end: When,
      prevStart: When,
      prevEnd: When,
      edges: z.array(When).max(40),
      labels: z.array(z.string().max(8)).max(40),
    }),
  )
  .handler(async ({ data }) =>
    computeReport(data.period, {
      start: new Date(data.start),
      end: new Date(data.end),
      prevStart: new Date(data.prevStart),
      prevEnd: new Date(data.prevEnd),
      edges: data.edges.map((e) => new Date(e)),
      labels: data.labels,
    }),
  );
