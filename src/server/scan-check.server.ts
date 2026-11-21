import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mine, owned } from "./tenant.js";
import { movements, products, staffSchedules } from "../../db/schema.js";
import { cleanSchedule, type ScanRow, type Schedule, type ScheduleDay } from "../lib/scan-check.js";
import { deriveInitials } from "../lib/inventory-defaults.js";
import { saveSnapshot } from "./trash.server.js";

/** Every team member's usual week. */
export async function listSchedules(): Promise<Schedule[]> {
  const rows = await db.select().from(staffSchedules).where(mine(staffSchedules));
  const by = new Map<string, ScheduleDay[]>();
  for (const r of rows) by.set(r.staffName, [...(by.get(r.staffName) ?? []), { weekday: r.weekday, start: r.start, end: r.end }]);
  return [...by.entries()].map(([staffName, days]) => ({ staffName, days: cleanSchedule(days) }));
}

/** Replaces one person's usual week. */
export async function saveSchedule(staffName: string, days: ScheduleDay[]) {
  const name = staffName.trim();
  if (!name) throw new Error("Whose schedule is this?");
  const clean = cleanSchedule(days);
  await db.delete(staffSchedules).where(and(mine(staffSchedules), eq(staffSchedules.staffName, name)));
  if (clean.length) await db.insert(staffSchedules).values(clean.map((d) => ({ ...owned(), staffName: name, ...d })));
  return listSchedules();
}

/** Scans in a window (newest first), with who was signed in, for the scan check. */
export async function scanRows(since: Date, limit = 3000): Promise<ScanRow[]> {
  const rows = await db
    .select({
      id: movements.id,
      productName: products.name,
      type: movements.type,
      delta: movements.delta,
      staffName: movements.staffName,
      signedInAs: movements.signedInAs,
      at: movements.createdAt,
      note: movements.note,
    })
    .from(movements)
    .innerJoin(products, and(eq(products.id, movements.productId), mine(products)))
    .where(and(mine(movements), gte(movements.createdAt, since)))
    .orderBy(desc(movements.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}

/** Owner: put scans under the right person's name. Undo puts the old names back. */
export async function reassignScans(ids: number[], staffName: string) {
  const name = staffName.trim();
  if (!name || ids.length === 0) throw new Error("Pick who really made these scans.");
  const before = await db
    .select({ id: movements.id, staffName: movements.staffName, staffInitials: movements.staffInitials })
    .from(movements)
    .where(and(mine(movements), inArray(movements.id, ids)));
  await db
    .update(movements)
    .set({ staffName: name, staffInitials: deriveInitials(name) })
    .where(and(mine(movements), inArray(movements.id, ids)));
  const undoId = await saveSnapshot(
    "reassign",
    `${before.length} scan${before.length === 1 ? "" : "s"} → ${name}`,
    { updates: before.map((b) => ({ table: "movements" as const, id: b.id, set: { staffName: b.staffName, staffInitials: b.staffInitials } })) },
    { listed: false },
  );
  return { moved: before.length, undoId };
}
