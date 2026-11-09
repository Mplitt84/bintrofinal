import { eq, asc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { h as db, w as businessProfile, x as calendarEvents } from "./auth.middleware-2uPScvPU.js";
import { E as EMPTY_PROFILE } from "./business-types-DKNVcfJE.js";
const PROFILE_ID = 1;
function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    date: row.date,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    repeat: row.repeat,
    notes: row.notes,
    staffName: row.staffName
  };
}
async function findCalendarEvents() {
  const rows = await db.select().from(calendarEvents).orderBy(asc(calendarEvents.date), asc(calendarEvents.startTime));
  return rows.map(toEvent);
}
async function insertCalendarEvents(items) {
  if (items.length) await db.insert(calendarEvents).values(items);
  return findCalendarEvents();
}
async function updateCalendarEvent(id, data) {
  await db.update(calendarEvents).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(calendarEvents.id, id));
  return findCalendarEvents();
}
async function deleteCalendarEvent(id) {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  return findCalendarEvents();
}
async function ensureCalendarToken(reset = false) {
  const rows = await db.select({ token: businessProfile.calendarToken }).from(businessProfile).where(eq(businessProfile.id, PROFILE_ID));
  const current = rows[0]?.token ?? "";
  if (current && !reset) return current;
  const token = randomBytes(18).toString("base64url");
  await db.insert(businessProfile).values({ ...EMPTY_PROFILE, id: PROFILE_ID, calendarToken: token }).onConflictDoUpdate({ target: businessProfile.id, set: { calendarToken: token } });
  return token;
}
async function isCalendarToken(token) {
  if (!token) return false;
  const rows = await db.select({ token: businessProfile.calendarToken }).from(businessProfile).where(eq(businessProfile.id, PROFILE_ID));
  return Boolean(rows[0]?.token) && rows[0].token === token;
}
export {
  insertCalendarEvents as a,
  deleteCalendarEvent as d,
  ensureCalendarToken as e,
  findCalendarEvents as f,
  isCalendarToken as i,
  updateCalendarEvent as u
};
