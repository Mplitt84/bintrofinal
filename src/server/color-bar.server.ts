import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mine, owned } from "./tenant.js";
import { businessProfile, colorBowls, products, services } from "../../db/schema.js";
import { lineCost, type Bowl, type BowlLine, type Service } from "../lib/color-bar.js";
import { rowsSnapshot, saveSnapshot } from "./trash.server.js";
import { saveFormula } from "./formulas.server.js";
import type { FormulaKind } from "../lib/formulas.js";

const toService = (r: typeof services.$inferSelect): Service => ({
  id: r.id, name: r.name, priceCents: r.priceCents, minutes: r.minutes, productCents: r.productCents, active: r.active,
});
const toBowl = (r: typeof colorBowls.$inferSelect): Bowl => ({
  id: r.id, dayKey: r.dayKey, clientName: r.clientName, serviceId: r.serviceId, serviceName: r.serviceName, staffName: r.staffName,
  lines: r.lines, leftoverGrams: r.leftoverGrams, costCents: r.costCents, chargedCents: r.chargedCents, note: r.note,
});

export async function colorBarSettings() {
  const [row] = await db
    .select({ laborCentsPerHour: businessProfile.laborCentsPerHour, productMarkupPct: businessProfile.productMarkupPct })
    .from(businessProfile)
    .where(mine(businessProfile));
  return row ?? { laborCentsPerHour: 0, productMarkupPct: 0 };
}

export async function saveColorBarSettings(patch: { laborCentsPerHour?: number; productMarkupPct?: number }) {
  await db.update(businessProfile).set(patch).where(mine(businessProfile));
  return colorBarSettings();
}

export async function listServices() {
  const rows = await db.select().from(services).where(mine(services)).orderBy(services.name);
  return rows.map(toService);
}

/** Everything the Color bar and Services screens need since a day (YYYY-MM-DD). */
export async function loadColorBar(sinceDay: string) {
  const [svc, bowls, settings] = await Promise.all([
    listServices(),
    db.select().from(colorBowls).where(and(mine(colorBowls), gte(colorBowls.dayKey, sinceDay))).orderBy(desc(colorBowls.dayKey), desc(colorBowls.id)),
    colorBarSettings(),
  ]);
  return { services: svc, bowls: bowls.map(toBowl), settings };
}

export async function saveService(input: Omit<Service, "id"> & { id?: number }) {
  const v = {
    name: input.name.trim().slice(0, 80),
    priceCents: Math.max(0, Math.round(input.priceCents)),
    minutes: Math.max(0, Math.round(input.minutes)),
    productCents: Math.max(0, Math.round(input.productCents)),
    active: input.active,
  };
  if (!v.name) throw new Error("Name the service.");
  const clash = (await listServices()).find((s) => s.name.toLowerCase() === v.name.toLowerCase() && s.id !== input.id);
  if (clash) throw new Error(`“${clash.name}” is already on your menu.`);
  if (input.id) {
    const before = (await listServices()).find((s) => s.id === input.id);
    if (!before) throw new Error("That service was deleted.");
    await db.update(services).set(v).where(and(mine(services), eq(services.id, input.id)));
    const { id: _id, ...set } = before;
    const undoId = await saveSnapshot("service", `Edited ${v.name}`, { updates: [{ table: "services", id: input.id, set }] }, { listed: false });
    return { services: await listServices(), undoId };
  }
  const [row] = await db.insert(services).values({ ...owned(), ...v }).returning({ id: services.id });
  const undoId = await saveSnapshot("service", `Added ${v.name}`, { deletes: [{ table: "services", ids: [row.id] }] }, { listed: false });
  return { services: await listServices(), undoId };
}

export async function deleteService(id: number) {
  const snap = await rowsSnapshot("services", [id]);
  const name = String(snap.inserts?.[0]?.rows[0]?.name ?? "service");
  const undoId = await saveSnapshot("service", `Service ${name}`, snap);
  await db.delete(services).where(and(mine(services), eq(services.id, id)));
  return { services: await listServices(), undoId };
}

export type BowlInput = {
  dayKey: string;
  clientName: string;
  serviceId: number | null;
  staffName: string;
  lines: { productId: number | null; name: string; grams: number }[];
  leftoverGrams: number;
  chargedCents: number;
  note: string;
  /** Also write it on the client's record as a visit (formula lines in grams). */
  addToRecord?: { kind: FormulaKind } | null;
};

/** Saves a bowl. Costs are worked out here from today's product costs, never trusted from the device. */
export async function saveBowl(input: BowlInput) {
  const lines = input.lines.filter((l) => l.name.trim() && l.grams > 0);
  if (lines.length === 0) throw new Error("Add at least one product with grams.");
  const ids = lines.map((l) => l.productId).filter((x): x is number => x != null);
  const prods = ids.length
    ? await db.select({ id: products.id, name: products.name, size: products.size, unitCostCents: products.unitCostCents }).from(products).where(and(mine(products), inArray(products.id, ids)))
    : [];
  const byId = new Map(prods.map((p) => [p.id, p]));
  const costed: BowlLine[] = lines.map((l) => ({
    productId: l.productId != null && byId.has(l.productId) ? l.productId : null,
    name: l.name.trim().slice(0, 120),
    grams: Math.round(l.grams * 10) / 10,
    costCents: lineCost(l.productId != null ? (byId.get(l.productId) ?? null) : null, l.grams),
  }));
  const service = input.serviceId ? (await listServices()).find((s) => s.id === input.serviceId) : undefined;
  const costCents = costed.reduce((s, l) => s + l.costCents, 0);
  const [row] = await db
    .insert(colorBowls)
    .values({
      ...owned(),
      dayKey: input.dayKey,
      clientName: input.clientName.trim().slice(0, 80),
      serviceId: service?.id ?? null,
      serviceName: service?.name ?? "",
      staffName: input.staffName.trim().slice(0, 60),
      lines: costed,
      leftoverGrams: Math.max(0, Math.round(input.leftoverGrams)),
      costCents,
      chargedCents: Math.max(0, Math.round(input.chargedCents)),
      note: input.note.trim().slice(0, 500),
    })
    .returning();
  let visitId: number | null = null;
  if (input.addToRecord && row.clientName) {
    const visit = await saveFormula({
      kind: input.addToRecord.kind,
      clientName: row.clientName,
      serviceDate: row.dayKey,
      service: row.serviceName,
      lines: costed.map((l) => ({ item: l.name, amount: `${l.grams} g` })),
      tags: [],
      retail: [],
      developer: "",
      ratio: "",
      processingMinutes: 0,
      leftover: row.leftoverGrams ? `${row.leftoverGrams} g` : "",
      aftercare: "",
      followUpOn: "",
      notes: row.note,
      staffName: row.staffName,
    });
    visitId = visit.id;
  }
  const undoId = await saveSnapshot(
    "bowl",
    `Bowl for ${row.clientName || "a client"}`,
    { deletes: [{ table: "colorBowls", ids: [row.id] }, ...(visitId ? [{ table: "clientFormulas" as const, ids: [visitId] }] : [])] },
    { listed: false },
  );
  return { bowl: toBowl(row), undoId };
}

export async function deleteBowl(id: number) {
  const snap = await rowsSnapshot("colorBowls", [id]);
  const undoId = await saveSnapshot("bowl", `Bowl for ${String(snap.inserts?.[0]?.rows[0]?.clientName || "a client")}`, snap);
  await db.delete(colorBowls).where(and(mine(colorBowls), eq(colorBowls.id, id)));
  return { undoId };
}
