/**
 * Sustainability (server-only): partners the shop writes in, and monthly color waste weights.
 * The arithmetic lives in src/lib/sustainability.ts.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { colorWasteLogs, sustainabilityPartners } from "../../db/schema.js";
import type { Partner, PartnerKind, WasteLog } from "../lib/sustainability.js";
import { mine, owned } from "./tenant.js";

export async function listPartners(): Promise<Partner[]> {
  const rows = await db.select().from(sustainabilityPartners).where(mine(sustainabilityPartners)).orderBy(asc(sustainabilityPartners.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as PartnerKind,
    contact: r.contact,
    website: r.website,
    since: r.since,
    notes: r.notes,
  }));
}

export type PartnerInput = Omit<Partner, "id">;

/** Adds a partner, or saves changes when an id is given. Names are unique per shop. */
export async function savePartner(input: PartnerInput & { id?: number }, addedBy: string) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the partner a name.");
  const website = input.website.trim() && !/^https?:\/\//i.test(input.website.trim()) ? `https://${input.website.trim()}` : input.website.trim();
  const values = { name, kind: input.kind, contact: input.contact.trim(), website, since: input.since, notes: input.notes.trim() };
  const existing = await listPartners();
  if (existing.some((p) => p.id !== input.id && p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("That partner is already on the list.");
  }
  if (input.id) {
    await db.update(sustainabilityPartners).set(values).where(and(mine(sustainabilityPartners), eq(sustainabilityPartners.id, input.id)));
  } else {
    await db.insert(sustainabilityPartners).values({ ...owned(), ...values, addedBy });
  }
  return listPartners();
}

export async function deletePartner(id: number) {
  await db.delete(sustainabilityPartners).where(and(mine(sustainabilityPartners), eq(sustainabilityPartners.id, id)));
  return listPartners();
}

/** The last two years of color waste, newest first. */
export async function listWasteLogs(): Promise<WasteLog[]> {
  const rows = await db.select().from(colorWasteLogs).where(mine(colorWasteLogs)).orderBy(desc(colorWasteLogs.month)).limit(24);
  return rows.map((r) => ({ id: r.id, month: r.month, grams: r.grams, costCentsPerOz: r.costCentsPerOz, note: r.note, loggedBy: r.loggedBy }));
}

/** One weight per month: logging a month again replaces it. */
export async function saveWasteLog(input: { month: string; grams: number; costCentsPerOz: number; note: string }, loggedBy: string) {
  if (input.grams < 0) throw new Error("Weight can't be negative.");
  const values = { grams: input.grams, costCentsPerOz: input.costCentsPerOz, note: input.note.trim(), loggedBy, updatedAt: new Date() };
  await db
    .insert(colorWasteLogs)
    .values({ ...owned(), month: input.month, ...values })
    .onConflictDoUpdate({ target: [colorWasteLogs.businessId, colorWasteLogs.month], set: values });
  return listWasteLogs();
}

export async function deleteWasteLog(id: number) {
  await db.delete(colorWasteLogs).where(and(mine(colorWasteLogs), eq(colorWasteLogs.id, id)));
  return listWasteLogs();
}
