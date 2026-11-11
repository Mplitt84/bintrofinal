import { asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businessProfile, clientFormulas, formulaPhotos } from "../../db/schema.js";
import { applyMovement } from "./inventory.server.js";
import { EMPTY_PROFILE } from "../lib/business-types.js";
import type { ClientFormula, FormulaInput, FormulaPhoto } from "../lib/formulas.js";

type Row = typeof clientFormulas.$inferSelect;

function toFormula(r: Row, photoCount = 0): ClientFormula {
  return {
    photoCount,
    retail: r.retail,
    id: r.id,
    kind: r.kind === "tattoo" ? "tattoo" : "hair",
    clientName: r.clientName,
    serviceDate: r.serviceDate,
    service: r.service,
    lines: r.lines,
    developer: r.developer,
    ratio: r.ratio,
    processingMinutes: r.processingMinutes,
    leftover: r.leftover,
    aftercare: r.aftercare,
    followUpOn: r.followUpOn,
    notes: r.notes,
    staffName: r.staffName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const values = (f: FormulaInput) => ({
  kind: f.kind,
  clientName: f.clientName.trim(),
  serviceDate: f.serviceDate,
  service: f.service.trim(),
  retail: f.retail
    .filter((x) => x.name.trim() && x.qty > 0)
    .map((x) => ({ productId: x.productId, name: x.name.trim(), qty: Math.round(x.qty), sold: x.sold, logged: Boolean(x.logged) })),
  lines: f.lines.map((l) => ({ item: l.item.trim(), amount: l.amount.trim() })).filter((l) => l.item),
  developer: f.developer.trim(),
  ratio: f.ratio.trim(),
  processingMinutes: Math.max(0, Math.round(f.processingMinutes)),
  leftover: f.leftover.trim(),
  aftercare: f.aftercare.trim(),
  followUpOn: f.followUpOn,
  notes: f.notes.trim(),
  staffName: f.staffName.trim(),
});

export async function listFormulas(search: string, limit = 80) {
  const q = search.trim().replace(/[%_]/g, "");
  const rows = await db
    .select()
    .from(clientFormulas)
    .where(q ? ilike(clientFormulas.clientName, `%${q}%`) : undefined)
    .orderBy(desc(clientFormulas.serviceDate), desc(clientFormulas.id))
    .limit(limit);
  return withPhotoCounts(rows);
}

async function withPhotoCounts(rows: Row[]) {
  if (!rows.length) return [];
  const counts = await db
    .select({ formulaId: formulaPhotos.formulaId, n: sql<number>`count(*)::int` })
    .from(formulaPhotos)
    .where(inArray(formulaPhotos.formulaId, rows.map((r) => r.id)))
    .groupBy(formulaPhotos.formulaId);
  const byId = new Map(counts.map((c) => [c.formulaId, c.n]));
  return rows.map((r) => toFormula(r, byId.get(r.id) ?? 0));
}

/** Everything, oldest first, for the CSV backup. */
export async function allFormulas() {
  const rows = await db.select().from(clientFormulas).orderBy(asc(clientFormulas.clientName), asc(clientFormulas.serviceDate));
  return rows.map((r) => toFormula(r));
}

/**
 * Takes sold prescription items out of stock once (marked `logged` so an edit never logs them twice).
 * Returns the retail list with the logged flags set.
 */
async function logSoldRetail(f: FormulaInput) {
  const out = [];
  for (const x of f.retail) {
    if (x.sold && !x.logged && x.productId && x.qty > 0) {
      await applyMovement({ productId: x.productId, type: "out", delta: -Math.round(x.qty), staffName: f.staffName || "Formulas", note: `Prescription: ${f.clientName.trim()}` });
      out.push({ ...x, logged: true });
    } else out.push(x);
  }
  return out;
}

export async function saveFormula(input: FormulaInput & { id?: number }) {
  const f = { ...input, retail: await logSoldRetail(input) };
  if (f.id) {
    const [row] = await db.update(clientFormulas).set({ ...values(f), updatedAt: new Date() }).where(eq(clientFormulas.id, f.id)).returning();
    if (!row) throw new Error("That formula was deleted.");
    return (await withPhotoCounts([row]))[0];
  }
  const [row] = await db.insert(clientFormulas).values(values(f)).returning();
  return toFormula(row);
}

export async function deleteFormula(id: number) {
  await db.delete(clientFormulas).where(eq(clientFormulas.id, id));
}

export async function getAftercareTemplate() {
  const rows = await db.select({ t: businessProfile.aftercareTemplate }).from(businessProfile).where(eq(businessProfile.id, 1));
  return rows[0]?.t ?? "";
}

export async function setAftercareTemplate(text: string) {
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, id: 1, aftercareTemplate: text })
    .onConflictDoUpdate({ target: businessProfile.id, set: { aftercareTemplate: text } });
}

export async function listPhotos(formulaId: number): Promise<FormulaPhoto[]> {
  const rows = await db.select().from(formulaPhotos).where(eq(formulaPhotos.formulaId, formulaId)).orderBy(asc(formulaPhotos.id));
  return rows.map((p) => ({ id: p.id, label: p.label === "before" ? "before" : "after", url: `data:${p.mediaType};base64,${p.data}` }));
}

export async function addPhoto(formulaId: number, label: "before" | "after", data: string) {
  await db.insert(formulaPhotos).values({ formulaId, label, data, mediaType: "image/jpeg" });
  return listPhotos(formulaId);
}

export async function removePhoto(id: number) {
  const [row] = await db.delete(formulaPhotos).where(eq(formulaPhotos.id, id)).returning({ formulaId: formulaPhotos.formulaId });
  return row ? listPhotos(row.formulaId) : [];
}
