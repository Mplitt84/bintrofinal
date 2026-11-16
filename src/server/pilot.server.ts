/**
 * Pilot invites (server-only).
 *
 * The pilot is invite-only. The site owner (BINTRO_OWNER_EMAIL, in business 1)
 * keeps a list of tester emails here. On a tester's first Google sign-in, Bintro
 * makes them a brand-new, empty business with them as its owner — so every tester
 * gets their own inventory, their own 18-month pilot clock, and never sees another
 * tester's data or email address.
 *
 * The list belongs to the site rather than to any one business, so its queries are
 * deliberately cross-business and carry the marker the tenancy guard looks for.
 * Only the site owner can reach the functions that read or change it.
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appUsers, pilotInvites } from "../../db/schema.js";

const siteWide = sql`/* cross-business: pilot invites belong to the site */ true`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PilotInvite = {
  id: number;
  email: string;
  note: string;
  invitedAt: string;
  joinedAt: string | null;
};

export async function listInvites(): Promise<PilotInvite[]> {
  const rows = await db.select().from(pilotInvites).where(siteWide).orderBy(asc(pilotInvites.createdAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    note: r.note,
    invitedAt: r.createdAt.toISOString(),
    joinedAt: r.claimedAt?.toISOString() ?? null,
  }));
}

export async function addInvite(email: string, note: string, invitedBy: string) {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) throw new Error("That doesn't look like an email address.");
  const [existing] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(sql`/* cross-business: is this email already on Bintro */ true`, eq(appUsers.email, clean)));
  if (existing) throw new Error("That email can already sign in to Bintro, so it doesn't need an invite.");
  await db
    .insert(pilotInvites)
    .values({ email: clean, note: note.trim().slice(0, 120), invitedBy })
    .onConflictDoUpdate({ target: pilotInvites.email, set: { note: note.trim().slice(0, 120) } });
}

/** Only an invite nobody has used yet can be taken back; a joined tester owns their business. */
export async function removeInvite(id: number) {
  const [row] = await db.select().from(pilotInvites).where(and(siteWide, eq(pilotInvites.id, id)));
  if (!row) return;
  if (row.claimedAt) throw new Error("This tester has already joined. Their business stays theirs.");
  await db.delete(pilotInvites).where(and(siteWide, eq(pilotInvites.id, id), isNull(pilotInvites.claimedAt)));
}

/** True when this email has an invite that hasn't been used yet. */
export async function hasOpenInvite(email: string) {
  const [row] = await db
    .select({ id: pilotInvites.id })
    .from(pilotInvites)
    .where(and(siteWide, eq(pilotInvites.email, email), isNull(pilotInvites.claimedAt)));
  return Boolean(row);
}

/**
 * Marks the invite used, once. Returns false if it was already used (or never
 * existed), so two sign-ins at the same moment can't make two businesses.
 */
export async function claimInvite(email: string) {
  const rows = await db
    .update(pilotInvites)
    .set({ claimedAt: new Date() })
    .where(and(siteWide, eq(pilotInvites.email, email), isNull(pilotInvites.claimedAt)))
    .returning({ id: pilotInvites.id });
  return rows.length > 0;
}

export async function recordClaim(email: string, businessId: number | null) {
  await db
    .update(pilotInvites)
    .set(businessId === null ? { claimedAt: null, claimedBusinessId: null } : { claimedBusinessId: businessId })
    .where(and(siteWide, eq(pilotInvites.email, email)));
}
