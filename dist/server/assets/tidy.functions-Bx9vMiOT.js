import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { sql, and, eq, gte, inArray, isNull, desc } from "drizzle-orm";
import { d as db, m as movements, a as products, b as parChanges, c as productCategories } from "./index-CaPewqP7.js";
import { a as applyImportLines } from "./import.server-C9r1JKIa.js";
import { f as findAllProducts, j as updateProductFields } from "./inventory.server-CSgjh4TC.js";
import { o as ordersOverview } from "./orders.server-B1EKP6A1.js";
import { v as vendorGroupLabel } from "./inventory-defaults-BnRHgx1T.js";
import { f as findBusinessProfile } from "./business.server-CHGYL_45.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./product-lookup.server-C6LGgHTN.js";
import "./bulk-import-Bd6tmV71.js";
import "./business-types-DKNVcfJE.js";
const DAY = 864e5;
const DEFAULT_LEAD_DAYS = 7;
const WEEKS = 12;
const SERVICE_Z = 1.65;
async function smartPars() {
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const sinceWeeks = new Date(now - WEEKS * 7 * DAY);
  const [all, usage, weekly, overview, profile] = await Promise.all([
    findAllProducts(),
    db.select({
      productId: movements.productId,
      used90: sql`coalesce(sum(-${movements.delta}), 0)::int`,
      used30: sql`coalesce(sum(case when ${movements.createdAt} >= ${since30} then -${movements.delta} else 0 end), 0)::int`
    }).from(movements).where(and(eq(movements.type, "out"), gte(movements.createdAt, since90))).groupBy(movements.productId),
    db.select({
      productId: movements.productId,
      week: sql`floor(extract(epoch from (now() - ${movements.createdAt})) / 604800)::int`,
      used: sql`coalesce(sum(-${movements.delta}), 0)::int`
    }).from(movements).where(and(eq(movements.type, "out"), gte(movements.createdAt, sinceWeeks))).groupBy(movements.productId, sql`2`),
    ordersOverview(),
    findBusinessProfile()
  ]);
  const used = new Map(usage.map((u) => [u.productId, u]));
  const weeksByProduct = /* @__PURE__ */ new Map();
  for (const w of weekly) {
    if (w.week < 0 || w.week >= WEEKS) continue;
    const arr = weeksByProduct.get(w.productId) ?? new Array(WEEKS).fill(0);
    arr[w.week] = Math.max(0, w.used);
    weeksByProduct.set(w.productId, arr);
  }
  const leadByVendor = new Map(overview.vendors.filter((v) => v.avgDays !== null).map((v) => [v.vendor, v.avgDays]));
  const cycle = Math.max(1, profile.orderEveryDays || 7);
  const suggestions = [];
  const overstock = [];
  for (const p of all) {
    const u = used.get(p.id);
    const used30 = Math.max(0, u?.used30 ?? 0);
    const used90 = Math.max(0, u?.used90 ?? 0);
    const pack = Math.max(1, p.packSize || 1);
    const vendor = vendorGroupLabel(p).vendor;
    const knownLead = leadByVendor.get(vendor);
    const lead = Math.max(1, Math.round(knownLead ?? DEFAULT_LEAD_DAYS));
    const ageDays = (now - p.createdAt.getTime()) / DAY;
    let par;
    let max;
    let perDay = 0;
    let reason;
    if (used90 > 0) {
      perDay = used30 > 0 ? 0.65 * (used30 / 30) + 0.35 * (used90 / 90) : used90 / 90;
      const weeksKnown = Math.max(1, Math.min(WEEKS, Math.floor(ageDays / 7)));
      const series = (weeksByProduct.get(p.id) ?? new Array(WEEKS).fill(0)).slice(0, weeksKnown);
      const mean = series.reduce((a, b) => a + b, 0) / series.length;
      const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length);
      const safety = weeksKnown >= 4 ? SERVICE_Z * sd * Math.sqrt(lead / 7) : perDay * lead * 0.5;
      par = Math.max(1, Math.ceil(perDay * lead + safety));
      max = Math.ceil((par + perDay * cycle) / pack) * pack;
      if (max <= par) max = Math.ceil((par + 1) / pack) * pack;
      const steadiness = weeksKnown < 4 ? "new, extra cushion" : sd > mean ? "use swings a lot, extra cushion" : "steady";
      reason = `≈ ${perDay >= 1 ? perDay.toFixed(1) : perDay.toFixed(2)} a day · ${lead}-day delivery${knownLead ? ` from ${vendor}` : " (assumed)"} · ${steadiness}`;
    } else if (ageDays >= 30) {
      par = 0;
      max = 0;
      reason = "Not used in 90 days · stops alerting";
    } else {
      continue;
    }
    if (par !== p.reorderThreshold || max !== p.maxQty) {
      suggestions.push({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        size: p.size,
        current: p.reorderThreshold,
        suggested: par,
        currentMax: p.maxQty,
        suggestedMax: max,
        packSize: pack,
        perDay,
        reason
      });
    }
    const onHand = Math.max(0, p.qty);
    if (perDay > 0 && max > 0 && onHand > max * 1.5) {
      overstock.push({
        productId: p.id,
        name: p.name,
        onHand,
        daysOfStock: Math.round(onHand / perDay),
        extraCents: (onHand - max) * p.unitCostCents
      });
    }
  }
  suggestions.sort((a, b) => Number(a.suggested === 0) - Number(b.suggested === 0) || Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current) || b.perDay - a.perDay);
  overstock.sort((a, b) => b.extraCents - a.extraCents);
  return { suggestions, overstock: overstock.slice(0, 25), orderEveryDays: cycle, lastChange: await lastParChange() };
}
async function applyPars(items, staffName = "") {
  if (items.length === 0) return { updated: 0, batchId: "" };
  const ids = items.map((i) => i.productId);
  const before = await db.select({ id: products.id, par: products.reorderThreshold, max: products.maxQty }).from(products).where(inArray(products.id, ids));
  const old = new Map(before.map((b) => [b.id, b]));
  const batchId = `par-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const rows = items.filter((i) => old.has(i.productId)).map((i) => ({
    batchId,
    productId: i.productId,
    oldPar: old.get(i.productId).par,
    oldMax: old.get(i.productId).max,
    newPar: i.par,
    newMax: i.max ?? old.get(i.productId).max,
    staffName: staffName.trim()
  }));
  for (let i = 0; i < rows.length; i += 200) await db.insert(parChanges).values(rows.slice(i, i + 200));
  let updated = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const chunk = rows.slice(i, i + 10);
    await Promise.all(chunk.map((r) => updateProductFields(r.productId, { reorderThreshold: r.newPar, maxQty: r.newMax })));
    updated += chunk.length;
  }
  return { updated, batchId };
}
async function lastParChange() {
  const [latest] = await db.select({ batchId: parChanges.batchId, at: parChanges.createdAt, staffName: parChanges.staffName }).from(parChanges).where(isNull(parChanges.undoneAt)).orderBy(desc(parChanges.createdAt), desc(parChanges.id)).limit(1);
  if (!latest) return null;
  const [{ n }] = await db.select({ n: sql`count(*)::int` }).from(parChanges).where(and(eq(parChanges.batchId, latest.batchId), isNull(parChanges.undoneAt)));
  return { batchId: latest.batchId, at: latest.at.toISOString(), products: n, staffName: latest.staffName };
}
async function undoParChange(batchId) {
  const rows = await db.select().from(parChanges).where(and(eq(parChanges.batchId, batchId), isNull(parChanges.undoneAt)));
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows.slice(i, i + 10).map((r) => updateProductFields(r.productId, { reorderThreshold: r.oldPar, maxQty: r.oldMax }).catch(() => null))
    );
  }
  await db.update(parChanges).set({ undoneAt: /* @__PURE__ */ new Date() }).where(eq(parChanges.batchId, batchId));
  return { restored: rows.length };
}
function categoryKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean).sort().join("");
}
async function categoryGroups() {
  const [counts, saved] = await Promise.all([
    db.select({ name: products.category, n: sql`count(*)::int` }).from(products).where(sql`${products.category} <> ''`).groupBy(products.category),
    db.select({ name: productCategories.name }).from(productCategories)
  ]);
  const byName = /* @__PURE__ */ new Map();
  for (const c of counts) byName.set(c.name, c.n);
  for (const s of saved) if (!byName.has(s.name)) byName.set(s.name, 0);
  const groups = /* @__PURE__ */ new Map();
  for (const [name, n] of byName) {
    const key = categoryKey(name);
    if (!key) continue;
    groups.set(key, [...groups.get(key) ?? [], { name, products: n }]);
  }
  return [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => b.products - a.products)).map((names) => ({ names, total: names.reduce((s, n) => s + n.products, 0) })).sort((a, b) => b.total - a.total);
}
async function categoryList() {
  const [counts, saved] = await Promise.all([
    db.select({ name: products.category, n: sql`count(*)::int` }).from(products).where(sql`${products.category} <> ''`).groupBy(products.category),
    db.select({ name: productCategories.name }).from(productCategories)
  ]);
  const savedNames = new Set(saved.map((s) => s.name));
  const out = /* @__PURE__ */ new Map();
  for (const c of counts) out.set(c.name, { name: c.name, products: c.n, saved: savedNames.has(c.name) });
  for (const s of saved) if (!out.has(s.name)) out.set(s.name, { name: s.name, products: 0, saved: true });
  return [...out.values()].sort((a, b) => b.products - a.products || a.name.localeCompare(b.name));
}
async function deleteCategoryName(name, moveTo) {
  const target = moveTo.trim();
  if (target && target !== name) return mergeCategoryNames([name], target);
  const moved = await db.update(products).set({ category: "", updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.category, name)).returning({ id: products.id });
  await db.delete(productCategories).where(eq(productCategories.name, name));
  return moved.length;
}
async function mergeCategoryNames(from, to) {
  const target = to.trim();
  const others = from.filter((f) => f !== target);
  if (!target || others.length === 0) return 0;
  const moved = await db.update(products).set({ category: target, updatedAt: /* @__PURE__ */ new Date() }).where(inArray(products.category, others)).returning({ id: products.id });
  const saved = await db.select().from(productCategories);
  const keep = saved.find((c) => c.name === target);
  const donor = saved.find((c) => others.includes(c.name));
  if (!keep && donor) await db.insert(productCategories).values({ name: target, taxGroup: donor.taxGroup }).onConflictDoNothing();
  const drop = saved.filter((c) => others.includes(c.name)).map((c) => c.id);
  if (drop.length) await db.delete(productCategories).where(inArray(productCategories.id, drop));
  return moved.length;
}
function nameKey(text) {
  return text.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim().replace(/\s+/g, " ");
}
function sizeKey(size) {
  return size.toLowerCase().replace(/[^0-9a-z.]/g, "");
}
async function duplicateGroups() {
  const all = await findAllProducts();
  const groups = /* @__PURE__ */ new Map();
  for (const p of all) {
    const key = `${nameKey(p.name)}|${sizeKey(p.size)}|${categoryKey(p.category)}`;
    groups.set(key, [...groups.get(key) ?? [], p]);
  }
  return [...groups.values()].filter((g) => g.length > 1).map((g) => ({
    products: g.sort((a, b) => Number(Boolean(b.squareVariationId)) - Number(Boolean(a.squareVariationId)) || b.qty - a.qty).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: p.size,
      category: p.category,
      vendor: p.vendor,
      qty: p.qty,
      barcode: p.barcode,
      linkedToSquare: Boolean(p.squareVariationId)
    }))
  }));
}
async function applyCounts(params) {
  const ids = params.counts.map((c) => c.productId);
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const lines = params.counts.filter((c) => byId.has(c.productId)).map((c) => {
    const p = byId.get(c.productId);
    return {
      productId: p.id,
      barcode: p.barcode,
      name: p.name,
      brand: p.brand,
      size: p.size,
      category: p.category,
      vendor: p.vendor,
      qty: Math.max(0, Math.trunc(c.counted)),
      unitCostCents: 0,
      retailPriceCents: 0
    };
  });
  if (lines.length === 0) return { created: 0, updated: 0, priced: 0, units: 0 };
  return applyImportLines({ mode: "inventory", staffName: params.staffName, source: "Stock count", lines });
}
const getSmartPars_createServerFn_handler = createServerRpc({
  id: "1925026b1c10db48c12f4e2bc0a90574b72aeb87e7330a3827a67fccd409c630",
  name: "getSmartPars",
  filename: "src/server/tidy.functions.ts"
}, (opts) => getSmartPars.__executeServer(opts));
const getSmartPars = createServerFn({
  method: "GET"
}).handler(getSmartPars_createServerFn_handler, async () => smartPars());
const setPars_createServerFn_handler = createServerRpc({
  id: "d2eb947b190bba465fbef4ff0d9f99bd3795e54e602970ea5d986889b4a3d83c",
  name: "setPars",
  filename: "src/server/tidy.functions.ts"
}, (opts) => setPars.__executeServer(opts));
const setPars = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  staffName: z.string().max(60).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    par: z.number().int().min(0).max(999),
    max: z.number().int().min(0).max(1e5).optional()
  })).max(2e3)
})).handler(setPars_createServerFn_handler, async ({
  data
}) => applyPars(data.items, data.staffName ?? ""));
const undoPars_createServerFn_handler = createServerRpc({
  id: "5e9cc7bed4be53338cc819999df27b71a3b7f2e251a871bec2af6e8aacdf1c05",
  name: "undoPars",
  filename: "src/server/tidy.functions.ts"
}, (opts) => undoPars.__executeServer(opts));
const undoPars = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  batchId: z.string().min(1).max(80)
})).handler(undoPars_createServerFn_handler, async ({
  data
}) => undoParChange(data.batchId));
const getCategoryGroups_createServerFn_handler = createServerRpc({
  id: "c99eae04126c4837f668644332b10e45598e6bab6fce5175259446c534e8becc",
  name: "getCategoryGroups",
  filename: "src/server/tidy.functions.ts"
}, (opts) => getCategoryGroups.__executeServer(opts));
const getCategoryGroups = createServerFn({
  method: "GET"
}).handler(getCategoryGroups_createServerFn_handler, async () => categoryGroups());
const mergeCategories_createServerFn_handler = createServerRpc({
  id: "7230639abe8c0164ddf5e85cd8ab6e7ee157f506a9ba2fe42176a6c72ac33fcc",
  name: "mergeCategories",
  filename: "src/server/tidy.functions.ts"
}, (opts) => mergeCategories.__executeServer(opts));
const mergeCategories = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  from: z.array(z.string().max(80)).min(2).max(30),
  to: z.string().trim().min(1).max(80)
})).handler(mergeCategories_createServerFn_handler, async ({
  data
}) => {
  await mergeCategoryNames(data.from, data.to);
  return categoryGroups();
});
const getDuplicateGroups_createServerFn_handler = createServerRpc({
  id: "c728e1641680bb1e244ecbe094379db36ff732fc76318b2a6e4de1f0f2e82b44",
  name: "getDuplicateGroups",
  filename: "src/server/tidy.functions.ts"
}, (opts) => getDuplicateGroups.__executeServer(opts));
const getDuplicateGroups = createServerFn({
  method: "GET"
}).handler(getDuplicateGroups_createServerFn_handler, async () => duplicateGroups());
const saveCounts_createServerFn_handler = createServerRpc({
  id: "94dc5d50022411a6f751d02b53efd5d2a75c57a40aaded921d36dec0e85d3213",
  name: "saveCounts",
  filename: "src/server/tidy.functions.ts"
}, (opts) => saveCounts.__executeServer(opts));
const saveCounts = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  staffName: z.string().max(60),
  counts: z.array(z.object({
    productId: z.number().int().positive(),
    counted: z.number().int().min(0).max(1e5)
  })).min(1).max(2e3)
})).handler(saveCounts_createServerFn_handler, async ({
  data
}) => applyCounts(data));
const getCategoryList_createServerFn_handler = createServerRpc({
  id: "96f04bf3fed34aecfd38cecaae8c2d98736f6c1e6a67aceefa2043d3f0ab4245",
  name: "getCategoryList",
  filename: "src/server/tidy.functions.ts"
}, (opts) => getCategoryList.__executeServer(opts));
const getCategoryList = createServerFn({
  method: "GET"
}).handler(getCategoryList_createServerFn_handler, async () => categoryList());
const deleteCategory_createServerFn_handler = createServerRpc({
  id: "877e4e27227a92db358a8d6d55b5295a38b2fb78c1b6aa8e3174209fdf9b131e",
  name: "deleteCategory",
  filename: "src/server/tidy.functions.ts"
}, (opts) => deleteCategory.__executeServer(opts));
const deleteCategory = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  name: z.string().min(1).max(80),
  moveTo: z.string().max(80)
})).handler(deleteCategory_createServerFn_handler, async ({
  data
}) => ({
  moved: await deleteCategoryName(data.name, data.moveTo),
  list: await categoryList()
}));
export {
  deleteCategory_createServerFn_handler,
  getCategoryGroups_createServerFn_handler,
  getCategoryList_createServerFn_handler,
  getDuplicateGroups_createServerFn_handler,
  getSmartPars_createServerFn_handler,
  mergeCategories_createServerFn_handler,
  saveCounts_createServerFn_handler,
  setPars_createServerFn_handler,
  undoPars_createServerFn_handler
};
