import { asc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../../db/index.js";
import { businessProfile, calendarEvents } from "../../db/schema.js";
import { EMPTY_PROFILE } from "../lib/business-types.js";
import type { CalendarEvent, EventInput, EventKind, Repeat } from "../lib/calendar.js";

const PROFILE_ID = 1;

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
  const rows = await db.select().from(calendarEvents).orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime));
  return rows.map(toEvent);
}

export async function insertCalendarEvents(items: EventInput[]) {
  if (items.length) await db.insert(calendarEvents).values(items);
  return findCalendarEvents();
}

export async function updateCalendarEvent(id: number, data: Partial<EventInput>) {
  await db.update(calendarEvents).set({ ...data, updatedAt: new Date() }).where(eq(calendarEvents.id, id));
  return findCalendarEvents();
}

export async function deleteCalendarEvent(id: number) {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  return findCalendarEvents();
}

/** The secret token in the subscription URL, created the first time the feed is shared. */
export async function ensureCalendarToken(reset = false) {
  const rows = await db.select({ token: businessProfile.calendarToken }).from(businessProfile).where(eq(businessProfile.id, PROFILE_ID));
  const current = rows[0]?.token ?? "";
  if (current && !reset) return current;
  const token = randomBytes(18).toString("base64url");
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, id: PROFILE_ID, calendarToken: token })
    .onConflictDoUpdate({ target: businessProfile.id, set: { calendarToken: token } });
  return token;
}

/** True when `token` is the current feed token. Empty tokens never match. */
export async function isCalendarToken(token: string) {
  if (!token) return false;
  const rows = await db.select({ token: businessProfile.calendarToken }).from(businessProfile).where(eq(businessProfile.id, PROFILE_ID));
  return Boolean(rows[0]?.token) && rows[0]!.token === token;
}
