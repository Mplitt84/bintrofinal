import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { computeOverview } from "./overview.server";

const When = z.string().datetime();

export const getOverview = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      start: When,
      end: When,
      prevStart: When,
      prevEnd: When,
      edges: z.array(When).max(40),
      labels: z.array(z.string().max(8)).max(40),
    }),
  )
  .handler(async ({ data }) =>
    computeOverview({
      start: new Date(data.start),
      end: new Date(data.end),
      prevStart: new Date(data.prevStart),
      prevEnd: new Date(data.prevEnd),
      edges: data.edges.map((e) => new Date(e)),
      labels: data.labels,
    }),
  );
