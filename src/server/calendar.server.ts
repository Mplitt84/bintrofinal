import { and, asc, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { businessId, mine, owned } from "./tenant.js";
import { businessProfile, calendarEvents } from "../../db/schema.js";
import { EMPTY_PROFILE } from "../lib/business-types.js";
import type { CalendarEvent, EventInput, EventKind, Repeat } from "../lib/calendar.js";


function toEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as EventKind,
    date: row.date,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    repeat: row.repeat as Repeat,
    notes: row.notes,
    staffName: row.staffName,
  };
}

export async function findCalendarEvents() {
  const rows = await db.select().from(calendarEvents).where(mine(calendarEvents)).orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime));
  return rows.map(toEvent);
}

export async function insertCalendarEvents(items: EventInput[]) {
  if (items.length) await db.insert(calendarEvents).values(items.map((i) => ({ ...i, ...owned() })));
  return findCalendarEvents();
}

export async function updateCalendarEvent(id: number, data: Partial<EventInput>) {
  await db.update(calendarEvents).set({ ...data, updatedAt: new Date() }).where(and(mine(calendarEvents), eq(calendarEvents.id, id)));
  return findCalendarEvents();
}

export async function deleteCalendarEvent(id: number) {
  await db.delete(calendarEvents).where(and(mine(calendarEvents), eq(calendarEvents.id, id)));
  return findCalendarEvents();
}

/** The secret token in the subscription URL, created the first time the feed is shared. */
export async function ensureCalendarToken(reset = false) {
  const rows = await db.select({ token: businessProfile.calendarToken }).from(businessProfile).where(mine(businessProfile));
  const current = rows[0]?.token ?? "";
  if (current && !reset) return current;
  const token = randomBytes(18).toString("base64url");
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, ...owned(), id: businessId(), calendarToken: token })
    .onConflictDoUpdate({ target: businessProfile.businessId, set: { calendarToken: token } });
  return token;
}

/**
 * The business whose calendar feed this secret token opens, or null.
 *
 * The feed URL is public and carries only the token, so this is a deliberate
 * cross-business lookup: the token is what says which business to answer for.
 * Everything the feed then reads runs inside that business's scope.
 */
export async function businessForCalendarToken(token: string) {
  if (!token) return null;
  const rows = await db
    .select({ businessId: businessProfile.businessId })
    .from(businessProfile)
    .where(and(sql`/* cross-business: calendar feed token */ true`, eq(businessProfile.calendarToken, token)));
  return rows[0]?.businessId ?? null;
}
