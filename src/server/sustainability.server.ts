/**
 * Sustainability (server-only): partners the shop writes in, and monthly color waste weights.
 * The arithmetic lives in src/lib/sustainability.ts.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { calendarEvents, colorMixes, colorWasteLogs, sustainabilityPartners } from "../../db/schema.js";
import { pickupEventTitle, type ColorMix, type Partner, type PartnerKind, type WasteLog } from "../lib/sustainability.js";
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
    pickupUrl: r.pickupUrl,
    pickupDay: r.pickupDay,
    affiliateOf: r.affiliateOf,
  }));
}

export type PartnerInput = Omit<Partner, "id" | "pickupUrl" | "pickupDay" | "affiliateOf"> &
  Partial<Pick<Partner, "pickupUrl" | "pickupDay" | "affiliateOf">>;

/** Adds a partner, or saves changes when an id is given. Names are unique per shop. */
export async function savePartner(input: PartnerInput & { id?: number }, addedBy: string) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the partner a name.");
  const website = input.website.trim() && !/^https?:\/\//i.test(input.website.trim()) ? `https://${input.website.trim()}` : input.website.trim();
  const withHttps = (u: string) => (u.trim() && !/^https?:\/\//i.test(u.trim()) ? `https://${u.trim()}` : u.trim());
  const pickupDay = Math.max(0, Math.min(31, Math.trunc(input.pickupDay ?? 0)));
  const values = {
    name,
    kind: input.kind,
    contact: input.contact.trim(),
    website,
    since: input.since,
    notes: input.notes.trim(),
    pickupUrl: withHttps(input.pickupUrl ?? ""),
    pickupDay,
    affiliateOf: (input.affiliateOf ?? "").trim(),
  };
  const existing = await listPartners();
  if (existing.some((p) => p.id !== input.id && p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("That partner is already on the list.");
  }
  const before = input.id ? existing.find((p) => p.id === input.id) : undefined;
  if (before && before.name !== name) {
    await db
      .update(calendarEvents)
      .set({ title: pickupEventTitle(name) })
      .where(and(mine(calendarEvents), eq(calendarEvents.title, pickupEventTitle(before.name))));
  }
  if (input.id) {
    await db.update(sustainabilityPartners).set(values).where(and(mine(sustainabilityPartners), eq(sustainabilityPartners.id, input.id)));
  } else {
    await db.insert(sustainabilityPartners).values({ ...owned(), ...values, addedBy });
  }
  await syncPickupReminder(name, values.pickupDay, values.pickupUrl, addedBy);
  return listPartners();
}

export async function deletePartner(id: number) {
  const gone = (await listPartners()).find((p) => p.id === id);
  if (gone) await db.delete(calendarEvents).where(and(mine(calendarEvents), eq(calendarEvents.title, pickupEventTitle(gone.name))));
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

const x100 = (n: number) => Math.round(n * 100);

/** The shop's color lines, in the order they were added. */
export async function listMixes(): Promise<ColorMix[]> {
  const rows = await db.select().from(colorMixes).where(mine(colorMixes)).orderBy(asc(colorMixes.createdAt), asc(colorMixes.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    colorCents: r.colorCents,
    colorOz: r.colorOzX100 / 100,
    developerCents: r.developerCents,
    developerOz: r.developerOzX100 / 100,
    colorParts: r.colorPartsX100 / 100,
    developerParts: r.developerPartsX100 / 100,
  }));
}

/** Adds a color line, or saves changes when an id is given. Names are unique per shop. */
export async function saveMix(input: Omit<ColorMix, "id"> & { id?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error("Give the color line a name.");
  if (!(input.colorParts > 0)) throw new Error("The color side of the ratio has to be more than 0.");
  const existing = await listMixes();
  if (existing.some((m) => m.id !== input.id && m.name.toLowerCase() === name.toLowerCase())) throw new Error("There's already a color line with that name.");
  const values = {
    name,
    colorCents: input.colorCents,
    colorOzX100: x100(input.colorOz),
    developerCents: input.developerCents,
    developerOzX100: x100(input.developerOz),
    colorPartsX100: x100(input.colorParts),
    developerPartsX100: x100(input.developerParts),
  };
  if (input.id) {
    await db.update(colorMixes).set(values).where(and(mine(colorMixes), eq(colorMixes.id, input.id)));
  } else {
    await db.insert(colorMixes).values({ ...owned(), ...values });
  }
  return listMixes();
}

export async function deleteMix(id: number) {
  await db.delete(colorMixes).where(and(mine(colorMixes), eq(colorMixes.id, id)));
  return listMixes();
}

/**
 * Keeps one monthly Calendar reminder per partner pickup: added when a pickup day is
 * set, moved when it changes, removed when it's cleared. The note carries the booking
 * link, which the Calendar shows as tappable. Dates in a short month land on its last day.
 */
async function syncPickupReminder(name: string, day: number, url: string, staffName: string) {
  const title = pickupEventTitle(name);
  if (!day) {
    await db.delete(calendarEvents).where(and(mine(calendarEvents), eq(calendarEvents.title, title)));
    return;
  }
  const now = new Date();
  const pick = (y: number, m: number) => {
    const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
  };
  const today = now.toISOString().slice(0, 10);
  let date = pick(now.getUTCFullYear(), now.getUTCMonth());
  if (date < today) date = pick(now.getUTCFullYear() + (now.getUTCMonth() === 11 ? 1 : 0), (now.getUTCMonth() + 1) % 12);
  const notes = url ? `Book this month's pickup: ${url}` : "Book this month's recyclables pickup.";
  const [existing] = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(and(mine(calendarEvents), eq(calendarEvents.title, title)));
  if (existing) {
    await db.update(calendarEvents).set({ date, notes, repeat: "monthly", updatedAt: new Date() }).where(and(mine(calendarEvents), eq(calendarEvents.id, existing.id)));
  } else {
    await db.insert(calendarEvents).values({ ...owned(), title, kind: "task", date, startTime: "", durationMinutes: 30, repeat: "monthly", notes, staffName });
  }
}
