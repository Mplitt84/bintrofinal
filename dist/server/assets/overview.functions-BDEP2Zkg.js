import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { h as db, p as products, m as movements, r as requireUser } from "./auth.middleware-2uPScvPU.js";
import { and, gte, lt } from "drizzle-orm";
import { c as findProductCategories, f as findBusinessProfile } from "./business.server-WsLDvovH.js";
import { u as useKindFor } from "./insights.server-CAe_YK1f.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "node:crypto";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./business-types-DKNVcfJE.js";
import "./insights-BQ2QJiNr.js";
import "./email.server-2uKsRAsj.js";
import "./inventory-defaults-BnRHgx1T.js";
import "./purchase-order-1ZyUH4cu.js";
import "./product-lookup.server-C6LGgHTN.js";
const empty = () => ({
  soldUnits: 0,
  soldCents: 0,
  soldUnpriced: 0,
  usedUnits: 0,
  usedCents: 0,
  receivedUnits: 0,
  receivedCents: 0,
  counts: 0,
  countNetUnits: 0,
  countNetCents: 0
});
async function computeOverview(w) {
  const [all, categories, profile, rows] = await Promise.all([
    db.select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      imageUrl: products.imageUrl,
      category: products.category,
      retailPriceCents: products.retailPriceCents,
      unitCostCents: products.unitCostCents
    }).from(products),
    findProductCategories(),
    findBusinessProfile(),
    db.select({ productId: movements.productId, type: movements.type, delta: movements.delta, createdAt: movements.createdAt }).from(movements).where(and(gte(movements.createdAt, w.prevStart < w.start ? w.prevStart : w.start), lt(movements.createdAt, w.end)))
  ]);
  const byId = new Map(all.map((p) => [p.id, { ...p, kind: useKindFor(p, categories, profile.businessType) }]));
  const current = empty();
  const previous = empty();
  const buckets = w.labels.map((label) => ({ label, soldUnits: 0, usedUnits: 0, receivedUnits: 0, soldCents: 0, usedCents: 0 }));
  const top = /* @__PURE__ */ new Map();
  for (const m of rows) {
    const p = byId.get(m.productId);
    if (!p) continue;
    const t = m.createdAt.getTime();
    const inCurrent = t >= w.start.getTime() && t < w.end.getTime();
    const inPrevious = t >= w.prevStart.getTime() && t < w.prevEnd.getTime();
    if (!inCurrent && !inPrevious) continue;
    const totals = inCurrent ? current : previous;
    const bucket = inCurrent ? buckets[w.edges.findIndex((e, i) => i < w.edges.length - 1 && t >= e.getTime() && t < w.edges[i + 1].getTime())] : void 0;
    if (m.type === "out") {
      const units = -m.delta;
      if (p.kind === "sold") {
        totals.soldUnits += units;
        totals.soldCents += units * p.retailPriceCents;
        if (!p.retailPriceCents) totals.soldUnpriced += units;
        if (bucket) {
          bucket.soldUnits += units;
          bucket.soldCents += units * p.retailPriceCents;
        }
      } else {
        totals.usedUnits += units;
        totals.usedCents += units * p.unitCostCents;
        if (bucket) {
          bucket.usedUnits += units;
          bucket.usedCents += units * p.unitCostCents;
        }
      }
      if (inCurrent) {
        const item = top.get(p.id) ?? {
          productId: p.id,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          kind: p.kind,
          units: 0,
          cents: 0
        };
        item.units += units;
        item.cents += units * (p.kind === "sold" ? p.retailPriceCents : p.unitCostCents);
        top.set(p.id, item);
      }
    } else if (m.type === "in" || m.type === "receive") {
      totals.receivedUnits += m.delta;
      totals.receivedCents += m.delta * p.unitCostCents;
      if (bucket) bucket.receivedUnits += m.delta;
    } else if (m.type === "adjust") {
      totals.counts += 1;
      totals.countNetUnits += m.delta;
      totals.countNetCents += m.delta * p.unitCostCents;
    }
  }
  return {
    current,
    previous,
    buckets,
    top: [...top.values()].filter((i) => i.units > 0).sort((a, b) => b.units - a.units || b.cents - a.cents).slice(0, 5),
    soldIds: [...byId.values()].filter((p) => p.kind === "sold").map((p) => p.id)
  };
}
const When = z.string().datetime();
const getOverview_createServerFn_handler = createServerRpc({
  id: "712911562ef8c115187d685eb31f0f116a98ff524a03bb8b43fe2abc0c72b2f7",
  name: "getOverview",
  filename: "src/server/overview.functions.ts"
}, (opts) => getOverview.__executeServer(opts));
const getOverview = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  start: When,
  end: When,
  prevStart: When,
  prevEnd: When,
  edges: z.array(When).max(40),
  labels: z.array(z.string().max(8)).max(40)
})).handler(getOverview_createServerFn_handler, async ({
  data
}) => computeOverview({
  start: new Date(data.start),
  end: new Date(data.end),
  prevStart: new Date(data.prevStart),
  prevEnd: new Date(data.prevEnd),
  edges: data.edges.map((e) => new Date(e)),
  labels: data.labels
}));
export {
  getOverview_createServerFn_handler
};
