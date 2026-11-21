import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mine } from "./tenant.js";
import { movements, products, stockCountLines } from "../../db/schema.js";
import { splitNote, withReason } from "../lib/corrections.js";
import { saveSnapshot, type Snapshot } from "./trash.server.js";

export type CorrectionRow = {
  id: number;
  productId: number;
  name: string;
  brand: string;
  unitCostCents: number;
  delta: number;
  note: string;
  staffName: string;
  signedInAs: string;
  at: string;
};

/** Every correction that lowered stock in a window, newest first (the device classifies them). */
export async function listCorrections(start: Date, end: Date): Promise<CorrectionRow[]> {
  const rows = await db
    .select({
      id: movements.id,
      productId: movements.productId,
      name: products.name,
      brand: products.brand,
      unitCostCents: products.unitCostCents,
      delta: movements.delta,
      note: movements.note,
      staffName: movements.staffName,
      signedInAs: movements.signedInAs,
      at: movements.createdAt,
    })
    .from(movements)
    .innerJoin(products, and(eq(products.id, movements.productId), mine(products)))
    .where(and(mine(movements), eq(movements.type, "adjust"), lt(movements.delta, 0), gte(movements.createdAt, start), lt(movements.createdAt, end)))
    .orderBy(desc(movements.createdAt))
    .limit(2000);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}

/**
 * Re-files corrections under a new reason (the stock change itself stays — the shelf count was
 * right; only whether it was a loss changes). Count lines follow, so Count history agrees.
 */
export async function refileCorrections(ids: number[], reason: string) {
  const rows = await db
    .select({ id: movements.id, note: movements.note, productId: movements.productId })
    .from(movements)
    .where(and(mine(movements), eq(movements.type, "adjust"), inArray(movements.id, ids)));
  const snap: Snapshot = { updates: [] };
  for (const r of rows) {
    snap.updates!.push({ table: "movements", id: r.id, set: { note: r.note } });
    await db.update(movements).set({ note: withReason(r.note, reason) }).where(and(mine(movements), eq(movements.id, r.id)));
    const countId = /^Count #(\d+)/.exec(splitNote(r.note).source)?.[1];
    if (countId) {
      const lines = await db
        .select({ id: stockCountLines.id, reason: stockCountLines.reason })
        .from(stockCountLines)
        .where(and(mine(stockCountLines), eq(stockCountLines.countId, Number(countId)), eq(stockCountLines.productId, r.productId)));
      for (const l of lines) {
        snap.updates!.push({ table: "stockCountLines", id: l.id, set: { reason: l.reason } });
        await db.update(stockCountLines).set({ reason }).where(and(mine(stockCountLines), eq(stockCountLines.id, l.id)));
      }
    }
  }
  const undoId = await saveSnapshot("refile", `${rows.length} correction${rows.length === 1 ? "" : "s"} → ${reason}`, snap, { listed: false });
  return { changed: rows.length, undoId };
}
