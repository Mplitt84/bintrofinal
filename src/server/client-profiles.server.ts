import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { mine, owned } from "./tenant.js";
import { clientFormulas, clientProfiles } from "../../db/schema.js";
import { clientKey, type ClientProfile, type ClientProfileInput } from "../lib/client-profile.js";
import { rowsOf, rowsSnapshot, saveSnapshot, type Snapshot } from "./trash.server.js";

type Row = typeof clientProfiles.$inferSelect;

const toProfile = (r: Row): ClientProfile => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  birthday: r.birthday,
  sensitivities: r.sensitivities,
  preferences: r.preferences,
  notes: r.notes,
  rebookDays: r.rebookDays,
});

/** Every saved profile (light: the list uses them for phone search, birthdays and due-back). */
export async function listProfiles(): Promise<ClientProfile[]> {
  const rows = await db.select().from(clientProfiles).where(mine(clientProfiles));
  return rows.map(toProfile);
}

export async function profileFor(name: string): Promise<ClientProfile | null> {
  const [row] = await db
    .select()
    .from(clientProfiles)
    .where(and(mine(clientProfiles), eq(clientProfiles.nameKey, clientKey(name))));
  return row ? toProfile(row) : null;
}

const clean = (p: ClientProfileInput) => ({
  name: p.name.trim().replace(/\s+/g, " "),
  nameKey: clientKey(p.name),
  phone: p.phone.trim(),
  email: p.email.trim(),
  birthday: /^\d{2}-\d{2}$/.test(p.birthday) ? p.birthday : "",
  sensitivities: p.sensitivities.trim(),
  preferences: p.preferences.trim(),
  notes: p.notes.trim(),
  rebookDays: Math.max(0, Math.min(365, Math.round(p.rebookDays || 0))),
});

/** Creates or updates the profile for this client name. Returns it and an undo id. */
export async function saveProfile(input: ClientProfileInput) {
  const v = clean(input);
  if (!v.name) throw new Error("Give the client a name.");
  const existing = await profileFor(v.name);
  if (existing) {
    const [before] = await rowsOf("clientProfiles", [existing.id]);
    const [row] = await db
      .update(clientProfiles)
      .set({ ...v, updatedAt: new Date() })
      .where(and(mine(clientProfiles), eq(clientProfiles.id, existing.id)))
      .returning();
    const { id: _id, businessId: _b, createdAt: _c, ...set } = before as Record<string, unknown>;
    const undoId = await saveSnapshot("client-profile", `Edited ${v.name}`, { updates: [{ table: "clientProfiles", id: existing.id, set }] }, { listed: false });
    return { profile: toProfile(row), undoId };
  }
  const [row] = await db.insert(clientProfiles).values({ ...owned(), ...v }).returning();
  const undoId = await saveSnapshot("client-profile", `Added ${v.name}`, { deletes: [{ table: "clientProfiles", ids: [row.id] }] }, { listed: false });
  return { profile: toProfile(row), undoId };
}

/**
 * Renames a client everywhere: every visit and their profile. When the new name is
 * another client already on file (the same person typed two ways), the two are merged:
 * visits move over and the kept profile fills its blanks from the other.
 */
export async function renameClient(from: string, to: string) {
  const fromKey = clientKey(from);
  const toName = to.trim().replace(/\s+/g, " ");
  const toKey = clientKey(toName);
  if (!toName) throw new Error("Type the new name.");

  const visits = await db
    .select({ id: clientFormulas.id, clientName: clientFormulas.clientName })
    .from(clientFormulas)
    .where(and(mine(clientFormulas), sql`lower(regexp_replace(trim(${clientFormulas.clientName}), '\\s+', ' ', 'g')) = ${fromKey}`));
  const profiles = await db
    .select()
    .from(clientProfiles)
    .where(and(mine(clientProfiles), inArray(clientProfiles.nameKey, [...new Set([fromKey, toKey])])));
  const source = profiles.find((p) => p.nameKey === fromKey) ?? null;
  const target = fromKey === toKey ? null : (profiles.find((p) => p.nameKey === toKey) ?? null);
  const merged = Boolean(target);

  const snap: Snapshot = { updates: visits.map((v) => ({ table: "clientFormulas" as const, id: v.id, set: { clientName: v.clientName } })) };
  if (source) snap.updates!.push({ table: "clientProfiles", id: source.id, set: { name: source.name, nameKey: source.nameKey } });

  if (visits.length) {
    await db
      .update(clientFormulas)
      .set({ clientName: toName, updatedAt: new Date() })
      .where(and(mine(clientFormulas), inArray(clientFormulas.id, visits.map((v) => v.id))));
  }
  if (source && target) {
    // Keep the target profile; fill its blanks from the one being folded in.
    const fill: Partial<Row> = {};
    for (const f of ["phone", "email", "birthday", "sensitivities", "preferences", "notes"] as const) {
      if (!target[f] && source[f]) fill[f] = source[f];
    }
    if (!target.rebookDays && source.rebookDays) fill.rebookDays = source.rebookDays;
    snap.updates!.push({ table: "clientProfiles", id: target.id, set: Object.fromEntries(Object.keys(fill).map((k) => [k, target[k as keyof Row]])) });
    snap.updates = snap.updates!.filter((u) => !(u.table === "clientProfiles" && u.id === source.id));
    snap.inserts = [{ table: "clientProfiles", rows: (await rowsOf("clientProfiles", [source.id])) as { id: number }[] }];
    if (Object.keys(fill).length) {
      await db.update(clientProfiles).set({ ...fill, updatedAt: new Date() }).where(and(mine(clientProfiles), eq(clientProfiles.id, target.id)));
    }
    await db.delete(clientProfiles).where(and(mine(clientProfiles), eq(clientProfiles.id, source.id)));
  } else if (source) {
    await db
      .update(clientProfiles)
      .set({ name: toName, nameKey: toKey, updatedAt: new Date() })
      .where(and(mine(clientProfiles), eq(clientProfiles.id, source.id)));
  }
  const undoId = await saveSnapshot("client-rename", `${from} → ${toName}`, snap, { listed: false });
  return { name: toName, visits: visits.length, merged, undoId };
}

/** Deletes a client: their profile and every visit (photos go with the visits). Listed in Recently deleted. */
export async function deleteClient(name: string) {
  const key = clientKey(name);
  const visits = await db
    .select({ id: clientFormulas.id })
    .from(clientFormulas)
    .where(and(mine(clientFormulas), sql`lower(regexp_replace(trim(${clientFormulas.clientName}), '\\s+', ' ', 'g')) = ${key}`));
  const profile = await profileFor(name);
  const snap = visits.length
    ? await rowsSnapshot("clientFormulas", visits.map((v) => v.id), [{ table: "formulaPhotos", column: "formulaId" }])
    : ({ inserts: [] } as Snapshot);
  if (profile) snap.inserts = [{ table: "clientProfiles", rows: (await rowsOf("clientProfiles", [profile.id])) as { id: number }[] }, ...(snap.inserts ?? [])];
  const undoId = await saveSnapshot("client", `Client ${name.trim()} (${visits.length} visit${visits.length === 1 ? "" : "s"})`, snap);
  if (visits.length) await db.delete(clientFormulas).where(and(mine(clientFormulas), inArray(clientFormulas.id, visits.map((v) => v.id))));
  if (profile) await db.delete(clientProfiles).where(and(mine(clientProfiles), eq(clientProfiles.id, profile.id)));
  return { undoId, visits: visits.length };
}
