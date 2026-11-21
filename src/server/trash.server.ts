/**
 * Undo and Recently deleted (server-only).
 *
 * Before a delete, merge or bulk change, the caller takes a snapshot here: the rows it
 * is about to remove (`inserts`, put back on undo with their own ids, so movements,
 * photos and links line up again), the old values of rows it is about to change
 * (`updates`), rows it is about to create that undo should remove (`deletes`), and
 * on-hand corrections (`qty`, relative, so scans made since aren't lost). `undo`
 * plays the snapshot back in that order: deletes, inserts, updates, qty.
 *
 * Every table it can touch is in TABLES, every row is written with this business's id
 * and every update is filtered by it, so a snapshot can never reach another shop.
 */
import { and, desc, eq, getTableColumns, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/index.js";
import { stockCountLines,
  calendarEvents,
  clientFormulas,
  clientProfiles,
  services,
  colorBowls,
  expenseReceipts,
  expenses,
  formulaPhotos,
  movements,
  priceChecks,
  priceHistory,
  productCategories,
  products,
  purchaseOrders,
  teamMembers,
  trash,
} from "../../db/schema.js";
import { businessId, mine, owned } from "./tenant.js";

const TABLES = {
  products,
  movements,
  priceChecks,
  priceHistory,
  clientFormulas,
  clientProfiles,
  services,
  colorBowls,
  formulaPhotos,
  calendarEvents,
  expenses,
  expenseReceipts,
  teamMembers,
  productCategories,
  purchaseOrders,
  stockCountLines,
} as const;
export type TableName = keyof typeof TABLES;

type Row = Record<string, unknown> & { id: number };
export type Snapshot = {
  inserts?: { table: TableName; rows: Row[] }[];
  updates?: { table: TableName; id: number; set: Record<string, unknown> }[];
  deletes?: { table: TableName; ids: number[] }[];
  qty?: { productId: number; delta: number }[];
  /** Stock movements to reverse the normal way (on-hand back, Square follows), e.g. a hand edit of the count. */
  reverseMovements?: number[];
};

export const KEEP_DAYS = 30;

/** JSON turned timestamps into strings; put them back as Dates for the table's date columns. */
function revive(table: PgTable, row: Record<string, unknown>) {
  const cols = getTableColumns(table) as Record<string, { dataType: string }>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!(key in cols)) continue;
    out[key] = cols[key].dataType === "date" && typeof value === "string" ? new Date(value) : value;
  }
  out.businessId = businessId();
  return out;
}

/** Rows of `table` by id, read now, for a snapshot. */
export async function rowsOf(table: TableName, ids: number[]): Promise<Row[]> {
  if (ids.length === 0) return [];
  const t = TABLES[table] as unknown as typeof products;
  return (await db.select().from(t).where(and(mine(t), inArray(t.id, ids)))) as unknown as Row[];
}

/** Saves a snapshot; returns its id for the toast's Undo. */
export async function saveSnapshot(kind: string, label: string, snapshot: Snapshot, opts: { listed?: boolean; by?: string } = {}) {
  const [row] = await db
    .insert(trash)
    .values({ ...owned(), kind, label: label.slice(0, 200), payload: snapshot as Record<string, unknown>, listed: opts.listed ?? true, by: opts.by ?? "" })
    .returning({ id: trash.id });
  return row.id;
}

/** Puts a snapshot back. Refuses one that was already undone. */
export async function undo(id: number) {
  const [entry] = await db.select().from(trash).where(and(mine(trash), eq(trash.id, id)));
  if (!entry) throw new Error("That can't be undone any more.");
  if (entry.restoredAt) return { label: entry.label, already: true };
  const snap = entry.payload as Snapshot;

  for (const d of snap.deletes ?? []) {
    const t = TABLES[d.table] as unknown as typeof products;
    if (d.ids.length) await db.delete(t).where(and(mine(t), inArray(t.id, d.ids)));
  }
  for (const ins of snap.inserts ?? []) {
    const t = TABLES[ins.table] as unknown as typeof products;
    if (ins.rows.length === 0) continue;
    const values = ins.rows.map((r) => revive(t, r));
    if (ins.table === "products") {
      // A barcode reused since the delete would clash: free it on the restored copy instead.
      for (const v of values) {
        const code = String(v.barcode ?? "");
        if (!code) continue;
        const [clash] = await db.select({ id: products.id }).from(products).where(and(mine(products), eq(products.barcode, code)));
        if (clash) v.barcode = `${code}-restored-${v.id}`;
      }
    }
    await db.insert(t).values(values.map((v) => ({ ...v, ...owned() })) as never).onConflictDoNothing();
  }
  for (const u of snap.updates ?? []) {
    const t = TABLES[u.table] as unknown as typeof products;
    const set = revive(t, u.set);
    delete set.id;
    delete set.businessId;
    if (Object.keys(set).length) await db.update(t).set(set as never).where(and(mine(t), eq(t.id, u.id)));
  }
  if (snap.reverseMovements?.length) {
    const { reverseAndDeleteMovement } = await import("./inventory.server.js");
    for (const m of snap.reverseMovements) await reverseAndDeleteMovement(m).catch(() => null);
  }
  for (const q of snap.qty ?? []) {
    if (q.delta) await db.update(products).set({ qty: sql`${products.qty} + ${q.delta}` }).where(and(mine(products), eq(products.id, q.productId)));
  }
  // Restored rows keep their old ids, which are always below each sequence's next value: no clash later.
  await db.update(trash).set({ restoredAt: new Date() }).where(and(mine(trash), eq(trash.id, id)));
  return { label: entry.label, already: false };
}

/** Recently deleted: last 30 days, newest first, not undone yet. */
export async function recentlyDeleted() {
  await pruneTrash();
  const since = new Date(Date.now() - KEEP_DAYS * 86_400_000);
  const rows = await db
    .select({ id: trash.id, kind: trash.kind, label: trash.label, by: trash.by, createdAt: trash.createdAt })
    .from(trash)
    .where(and(mine(trash), eq(trash.listed, true), isNull(trash.restoredAt), gte(trash.createdAt, since)))
    .orderBy(desc(trash.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** Drops snapshots past 30 days (called by the daily jobs). */
export async function pruneTrash() {
  await db.delete(trash).where(and(mine(trash), lt(trash.createdAt, new Date(Date.now() - KEEP_DAYS * 86_400_000))));
}

/* ------------------------------------------------------------------ Snapshot builders */

/** A product and everything deleted with it: movements, price checks, price history. */
export async function productSnapshot(ids: number[]): Promise<Snapshot> {
  if (ids.length === 0) return {};
  const [p, m, pc, ph] = await Promise.all([
    rowsOf("products", ids),
    db.select().from(movements).where(and(mine(movements), inArray(movements.productId, ids))),
    db.select().from(priceChecks).where(and(mine(priceChecks), inArray(priceChecks.productId, ids))),
    db.select().from(priceHistory).where(and(mine(priceHistory), inArray(priceHistory.productId, ids))),
  ]);
  return {
    inserts: [
      { table: "products", rows: p },
      { table: "movements", rows: m as unknown as Row[] },
      { table: "priceChecks", rows: pc as unknown as Row[] },
      { table: "priceHistory", rows: ph as unknown as Row[] },
    ],
  };
}

/** Old values of some fields on some products, for undoing an edit. */
export async function productFieldsSnapshot(ids: number[], fields: string[]): Promise<Snapshot> {
  const rows = await rowsOf("products", ids);
  return {
    updates: rows.map((r) => ({
      table: "products" as const,
      id: r.id,
      set: Object.fromEntries(fields.filter((f) => f in r).map((f) => [f, r[f]])),
    })),
  };
}

/** Products whose `field` equals one of `values` (vendor / category renames and deletes). */
export async function productIdsWhere(field: "vendor" | "category", values: string[]) {
  if (values.length === 0) return [];
  const col = field === "vendor" ? products.vendor : products.category;
  const rows = await db.select({ id: products.id }).from(products).where(and(mine(products), inArray(col, values)));
  return rows.map((r) => r.id);
}

/** Fields an edit can change (never qty, ids or timestamps: on-hand changes undo through movements). */
export const EDITABLE_PRODUCT_FIELDS = [
  "name", "brand", "size", "category", "vendor", "barcode", "extraBarcodes", "reorderThreshold", "maxQty", "packSize",
  "expiresOn", "unitCostCents", "retailPriceCents", "imageUrl", "priceUpdatedAt",
];

/** Before a merge: the duplicate and its history come back, its scans move home, the kept product's details go back. */
export async function mergeSnapshot(sourceId: number, targetId: number): Promise<{ snap: Snapshot; targetQty: number }> {
  const base = await productSnapshot([sourceId]);
  const [target] = await rowsOf("products", [targetId]);
  const moves = (base.inserts?.find((i) => i.table === "movements")?.rows ?? []) as Row[];
  return {
    targetQty: Number(target?.qty ?? 0),
    snap: {
      ...base,
      updates: [
        ...moves.map((m) => ({ table: "movements" as const, id: m.id, set: { productId: sourceId } })),
        ...(target ? [{ table: "products" as const, id: targetId, set: Object.fromEntries(EDITABLE_PRODUCT_FIELDS.map((f) => [f, target[f]])) }] : []),
      ],
    },
  };
}

/** Before categories are merged or deleted: each product's old category, and the saved categories that go. */
export async function categorySnapshot(names: string[]): Promise<Snapshot> {
  const ids = await productIdsWhere("category", names);
  const fields = await productFieldsSnapshot(ids, ["category"]);
  const saved = names.length
    ? await db.select().from(productCategories).where(and(mine(productCategories), inArray(productCategories.name, names)))
    : [];
  return { ...fields, inserts: [{ table: "productCategories", rows: saved as unknown as Row[] }] };
}

/** Before suppliers are merged, renamed or deleted: each product's old supplier. */
export async function vendorSnapshot(names: string[]): Promise<Snapshot> {
  return productFieldsSnapshot(await productIdsWhere("vendor", names), ["vendor"]);
}

/** Before rows are deleted: those rows, and the child rows that go with them. */
export async function rowsSnapshot(
  table: TableName,
  ids: number[],
  children: { table: TableName; column: string }[] = [],
): Promise<Snapshot> {
  const inserts: NonNullable<Snapshot["inserts"]> = [{ table, rows: await rowsOf(table, ids) }];
  for (const c of children) {
    const t = TABLES[c.table] as unknown as typeof products;
    const col = (t as unknown as Record<string, typeof products.id>)[c.column];
    const rows = ids.length ? await db.select().from(t).where(and(mine(t), inArray(col, ids))) : [];
    inserts.push({ table: c.table, rows: rows as unknown as Row[] });
  }
  return { inserts };
}
