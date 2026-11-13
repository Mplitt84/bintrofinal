/**
 * Count & reconcile: applies an approved stock count. Each product with a
 * difference gets an adjust movement noting the count and the reason, and the
 * count is saved with every line so it can be reviewed later. Server-only.
 */
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mine, owned } from "./tenant.js";
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
  const rows = ids.length ? await db.select().from(products).where(and(mine(products), inArray(products.id, ids))) : [];
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
      ...owned(),
    })
    .returning();
  for (let i = 0; i < lines.length; i += 200) {
    await db.insert(stockCountLines).values(lines.slice(i, i + 200).map((l) => ({ ...l, ...owned(), countId: count.id, reason: l.diff === 0 ? "" : l.reason })));
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
    undoneAt: c.undoneAt?.toISOString() ?? null,
    undoneBy: c.undoneBy,
  };
}

export async function countWithLines(countId: number) {
  const [count] = await db.select().from(stockCounts).where(and(mine(stockCounts), eq(stockCounts.id, countId)));
  if (!count) return null;
  return { count: summarize(count), lines: await countLines(countId) };
}

/**
 * Reverses a whole approved count: every product it changed moves back by the
 * same amount (an adjust movement "Undo count #id", which Square follows), the
 * count is marked undone, and "last counted" falls back to the count before it.
 * Relative, so scans made since the count are kept.
 */
export async function undoCount(countId: number, staffName: string) {
  const [count] = await db
    .update(stockCounts)
    .set({ undoneAt: new Date(), undoneBy: staffName.trim() })
    .where(and(eq(stockCounts.id, countId), isNull(stockCounts.undoneAt)))
    .returning();
  if (!count) throw new Error("That count was already undone.");

  const lines = await db.select().from(stockCountLines).where(and(mine(stockCountLines), eq(stockCountLines.countId, countId)));
  const ids = lines.map((l) => l.productId);
  const existing = new Set(
    ids.length ? (await db.select({ id: products.id }).from(products).where(and(mine(products), inArray(products.id, ids)))).map((p) => p.id) : [],
  );
  let reversed = 0;
  for (const l of lines) {
    if (l.diff === 0 || !existing.has(l.productId)) continue;
    await applyMovement({
      productId: l.productId,
      type: "adjust",
      delta: -l.diff,
      staffName,
      note: `Undo count #${countId}`,
      square: "later",
    });
    reversed++;
  }

  // "Last counted" goes back to the latest other count (not undone) that included the product.
  for (const id of ids) {
    if (!existing.has(id)) continue;
    const [prev] = await db
      .select({ at: stockCounts.createdAt, by: stockCounts.staffName })
      .from(stockCountLines)
      .innerJoin(stockCounts, eq(stockCounts.id, stockCountLines.countId))
      .where(and(eq(stockCountLines.productId, id), ne(stockCounts.id, countId), isNull(stockCounts.undoneAt)))
      .orderBy(desc(stockCounts.createdAt))
      .limit(1);
    await db
      .update(products)
      .set({ lastCountedAt: prev?.at ?? null, lastCountedBy: prev?.by ?? "" })
      .where(eq(products.id, id));
  }
  await flushSquareSoon();
  return { count: summarize(count), reversed };
}

export async function recentCounts(limit = 20): Promise<CountSummary[]> {
  const rows = await db.select().from(stockCounts).where(mine(stockCounts)).orderBy(desc(stockCounts.createdAt)).limit(limit);
  return rows.map(summarize);
}

export async function countLines(countId: number): Promise<CountLineDetail[]> {
  const rows = await db.select().from(stockCountLines).where(and(mine(stockCountLines), eq(stockCountLines.countId, countId)));
  return rows
    .map((r) => ({ productId: r.productId, name: r.name, expected: r.expected, counted: r.counted, diff: r.diff, unitCostCents: r.unitCostCents, reason: r.reason }))
    .sort((a, b) => Math.abs(b.diff * b.unitCostCents) - Math.abs(a.diff * a.unitCostCents) || Math.abs(b.diff) - Math.abs(a.diff));
}
