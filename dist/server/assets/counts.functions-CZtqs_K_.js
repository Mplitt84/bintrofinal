import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { inArray, desc, eq } from "drizzle-orm";
import { d as db, a as products, s as stockCounts, h as stockCountLines } from "./index-nBnBfwCa.js";
import { h as applyMovement, p as flushSquareSoon } from "./inventory.server-NFwTD6ZI.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./inventory-defaults-BnRHgx1T.js";
async function approveCount(params) {
  try {
    const { syncSquareSalesIfConnected } = await import("./integrations.server-DSD7tcf7.js");
    await syncSquareSalesIfConnected();
  } catch (error) {
    console.error("Square sales sync before count failed", error);
  }
  const ids = params.lines.map((l) => l.productId);
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const lines = params.lines.filter((l) => byId.has(l.productId)).map((l) => {
    const p = byId.get(l.productId);
    const counted = Math.max(0, Math.trunc(l.counted));
    return { productId: p.id, name: p.name, expected: p.qty, counted, diff: counted - p.qty, unitCostCents: p.unitCostCents, reason: l.reason };
  });
  const changed = lines.filter((l) => l.diff !== 0);
  const [count] = await db.insert(stockCounts).values({
    scope: params.scope.slice(0, 120),
    blind: params.blind,
    staffName: params.staffName.trim(),
    itemsCounted: lines.length,
    itemsChanged: changed.length,
    unitsOver: changed.filter((l) => l.diff > 0).reduce((s, l) => s + l.diff, 0),
    unitsShort: changed.filter((l) => l.diff < 0).reduce((s, l) => s - l.diff, 0),
    valueDiffCents: changed.reduce((s, l) => s + l.diff * l.unitCostCents, 0)
  }).returning();
  for (let i = 0; i < lines.length; i += 200) {
    await db.insert(stockCountLines).values(lines.slice(i, i + 200).map((l) => ({ ...l, countId: count.id, reason: l.diff === 0 ? "" : l.reason })));
  }
  for (const l of changed) {
    await applyMovement({
      productId: l.productId,
      type: "adjust",
      delta: l.diff,
      staffName: params.staffName,
      note: `Count #${count.id}${l.reason ? ` · ${l.reason}` : ""}`.slice(0, 200),
      square: "later"
    });
  }
  const countedIds = lines.map((l) => l.productId);
  if (countedIds.length) {
    await db.update(products).set({ lastCountedAt: count.createdAt, lastCountedBy: params.staffName.trim() }).where(inArray(products.id, countedIds));
  }
  await flushSquareSoon();
  return summarize(count);
}
function summarize(c) {
  return {
    id: c.id,
    scope: c.scope,
    blind: c.blind,
    staffName: c.staffName,
    itemsCounted: c.itemsCounted,
    itemsChanged: c.itemsChanged,
    unitsOver: c.unitsOver,
    unitsShort: c.unitsShort,
    valueDiffCents: c.valueDiffCents,
    createdAt: c.createdAt.toISOString()
  };
}
async function recentCounts(limit = 20) {
  const rows = await db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt)).limit(limit);
  return rows.map(summarize);
}
async function countLines(countId) {
  const rows = await db.select().from(stockCountLines).where(eq(stockCountLines.countId, countId));
  return rows.map((r) => ({ productId: r.productId, name: r.name, expected: r.expected, counted: r.counted, diff: r.diff, unitCostCents: r.unitCostCents, reason: r.reason })).sort((a, b) => Math.abs(b.diff * b.unitCostCents) - Math.abs(a.diff * a.unitCostCents) || Math.abs(b.diff) - Math.abs(a.diff));
}
const approveStockCount_createServerFn_handler = createServerRpc({
  id: "3af6d1532c5910dfeaf1944cfd3ea22a6cfe5d6d2cd58a6f7be05c8a845b4581",
  name: "approveStockCount",
  filename: "src/server/counts.functions.ts"
}, (opts) => approveStockCount.__executeServer(opts));
const approveStockCount = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  scope: z.string().max(120),
  blind: z.boolean(),
  staffName: z.string().max(60),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    counted: z.number().int().min(0).max(1e5),
    reason: z.string().max(80)
  })).min(1).max(3e3)
})).handler(approveStockCount_createServerFn_handler, async ({
  data
}) => approveCount(data));
const getCountHistory_createServerFn_handler = createServerRpc({
  id: "70a49bef360b5fee1216cae4408b5adaa514ef6d444589a51890f9fe5b87f134",
  name: "getCountHistory",
  filename: "src/server/counts.functions.ts"
}, (opts) => getCountHistory.__executeServer(opts));
const getCountHistory = createServerFn({
  method: "GET"
}).handler(getCountHistory_createServerFn_handler, async () => recentCounts());
const getCountLines_createServerFn_handler = createServerRpc({
  id: "f61d34714fb847548ce8ac02dc39c8f7402907e44e82cf47e337f1bcaf53d121",
  name: "getCountLines",
  filename: "src/server/counts.functions.ts"
}, (opts) => getCountLines.__executeServer(opts));
const getCountLines = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  countId: z.number().int().positive()
})).handler(getCountLines_createServerFn_handler, async ({
  data
}) => countLines(data.countId));
export {
  approveStockCount_createServerFn_handler,
  getCountHistory_createServerFn_handler,
  getCountLines_createServerFn_handler
};
