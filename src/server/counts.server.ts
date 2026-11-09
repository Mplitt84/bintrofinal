/**
 * Count & reconcile: applies an approved stock count. Each product with a
 * difference gets an adjust movement noting the count and the reason, and the
 * count is saved with every line so it can be reviewed later. Server-only.
 */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, stockCountLines, stockCounts } from "../../db/schema.js";
import { applyMovement, flushSquareSoon } from "./inventory.server.js";
import type { CountLineDetail, CountSummary } from "../lib/counts.js";

export async function approveCount(params: {
  scope: string;
  blind: boolean;
  staffName: string;
  lines: { productId: number; counted: number; reason: string }[];
}) {
  // Count Square sales first, so the count isn't later lowered again by sales it already reflects.
  try {
    const { syncSquareSalesIfConnected } = await import("./integrations.server.js");
    await syncSquareSalesIfConnected();
  } catch (error) {
    console.error("Square sales sync before count failed", error);
  }
  const ids = params.lines.map((l) => l.productId);
  const rows = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const lines = params.lines
    .filter((l) => byId.has(l.productId))
    .map((l) => {
      const p = byId.get(l.productId)!;
      const counted = Math.max(0, Math.trunc(l.counted));
      return { productId: p.id, name: p.name, expected: p.qty, counted, diff: counted - p.qty, unitCostCents: p.unitCostCents, reason: l.reason };
    });
  const changed = lines.filter((l) => l.diff !== 0);
  const [count] = await db
    .insert(stockCounts)
    .values({
      scope: params.scope.slice(0, 120),
      blind: params.blind,
      staffName: params.staffName.trim(),
      itemsCounted: lines.length,
      itemsChanged: changed.length,
      unitsOver: changed.filter((l) => l.diff > 0).reduce((s, l) => s + l.diff, 0),
      unitsShort: changed.filter((l) => l.diff < 0).reduce((s, l) => s - l.diff, 0),
      valueDiffCents: changed.reduce((s, l) => s + l.diff * l.unitCostCents, 0),
    })
    .returning();
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
      square: "later",
    });
  }
  // Every product in the count (matched or changed) records when and by whom it was last counted.
  const countedIds = lines.map((l) => l.productId);
  if (countedIds.length) {
    await db
      .update(products)
      .set({ lastCountedAt: count.createdAt, lastCountedBy: params.staffName.trim() })
      .where(inArray(products.id, countedIds));
  }
  await flushSquareSoon();
  return summarize(count);
}

function summarize(c: typeof stockCounts.$inferSelect): CountSummary {
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
    createdAt: c.createdAt.toISOString(),
  };
}

export async function recentCounts(limit = 20): Promise<CountSummary[]> {
  const rows = await db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt)).limit(limit);
  return rows.map(summarize);
}

export async function countLines(countId: number): Promise<CountLineDetail[]> {
  const rows = await db.select().from(stockCountLines).where(eq(stockCountLines.countId, countId));
  return rows
    .map((r) => ({ productId: r.productId, name: r.name, expected: r.expected, counted: r.counted, diff: r.diff, unitCostCents: r.unitCostCents, reason: r.reason }))
    .sort((a, b) => Math.abs(b.diff * b.unitCostCents) - Math.abs(a.diff * a.unitCostCents) || Math.abs(b.diff) - Math.abs(a.diff));
}
