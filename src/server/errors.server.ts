/**
 * Breakage log (server-only). Errors the app couldn't handle are written here so the
 * business finds out from Settings instead of from a staff member who gave up.
 */
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { errorReports } from "../../db/schema.js";

/** How long a report is kept before it is cleared out. */
export const ERROR_KEEP_DAYS = 30;
/** Most reports held at once; the oldest fall off. */
const MAX_ROWS = 500;

import type { ErrorReport } from "../lib/report-error.js";

export type { ErrorReport };

/**
 * Records one error. The same message in the same place is counted up rather than
 * stored again, so a screen that breaks on every render makes one row, not hundreds.
 */
export async function recordError(input: {
  message: string;
  where: string;
  detail: string;
  device: string;
  staffName: string;
}) {
  const message = input.message.trim().slice(0, 300) || "Unknown error";
  await db
    .insert(errorReports)
    .values({
      message,
      where: input.where.slice(0, 60),
      detail: input.detail.slice(0, 1200),
      device: input.device.slice(0, 80),
      staffName: input.staffName.slice(0, 60),
    })
    .onConflictDoUpdate({
      target: [errorReports.message, errorReports.where],
      set: {
        hits: sql`${errorReports.hits} + 1`,
        lastSeen: new Date(),
        device: input.device.slice(0, 80),
        staffName: input.staffName.slice(0, 60),
      },
    });
}

/** Recent breakage, most recent first. */
export async function findErrors(limit = 50): Promise<ErrorReport[]> {
  const rows = await db
    .select()
    .from(errorReports)
    .orderBy(desc(errorReports.lastSeen))
    .limit(Math.min(limit, 200));
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    where: r.where,
    detail: r.detail,
    device: r.device,
    staffName: r.staffName,
    hits: r.hits,
    firstSeen: r.firstSeen.toISOString(),
    lastSeen: r.lastSeen.toISOString(),
  }));
}

/** How many separate problems were seen in the last N days. */
export async function countRecentErrors(days = 7) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(errorReports)
    .where(sql`${errorReports.lastSeen} >= ${since}`);
  return row?.n ?? 0;
}

/** Marks one problem as dealt with. */
export async function clearError(id: number) {
  await db.delete(errorReports).where(eq(errorReports.id, id));
}

export async function clearAllErrors() {
  await db.delete(errorReports);
}

/** Drops reports older than the keep window, and any beyond the cap. */
export async function pruneErrors() {
  const cutoff = new Date(Date.now() - ERROR_KEEP_DAYS * 86_400_000);
  await db.delete(errorReports).where(lt(errorReports.lastSeen, cutoff));
  await db.delete(errorReports).where(
    and(
      sql`${errorReports.id} not in (select id from ${errorReports} order by last_seen desc limit ${MAX_ROWS})`,
    ),
  );
}
