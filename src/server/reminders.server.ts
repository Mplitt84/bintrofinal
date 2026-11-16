/**
 * The scheduled housekeeping reminder round (server-only), run every 10 minutes for
 * each business: refresh today's shifts from Square Appointments when connected, then
 * send each team member their "arriving" and "close out" reminders when their day
 * says so. Checkout reminders are sent by the Square sales sync as checkouts come in.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { staffShifts } from "../../db/schema.js";
import { nameKey } from "../lib/housekeeping.js";
import { arriveDue, closeDue, localDay, shiftFromSchedule, type Shift } from "../lib/schedule.js";
import { sendArrive, sendClose } from "./housekeeping-push.server.js";
import { syncSquareShifts } from "./integrations.server.js";
import { remindable } from "./push.server.js";
import { mine } from "./tenant.js";

export async function runHousekeepingReminders(now = new Date()) {
  const people = await remindable();
  if (people.length === 0) return { sent: 0 };
  // Square's day is optional: a failure here must not stop schedule-based reminders.
  await syncSquareShifts(now).catch((error) => console.error("Square shifts sync failed", error));

  let sent = 0;
  for (const person of people) {
    const { dayKey, weekday } = localDay(now, person.prefs.timeZone);
    let shift: Shift | null = null;
    if (person.prefs.source === "square") {
      const rows = await db.select().from(staffShifts).where(and(mine(staffShifts), eq(staffShifts.dayKey, dayKey)));
      const row = rows.find((r) => nameKey(r.staffName) === nameKey(person.staffName));
      if (row) shift = { start: row.startsAt, end: row.endsAt, source: "square" };
    }
    // No bookings found (or not on Square): fall back to the usual week.
    shift ??= shiftFromSchedule(person.schedule, dayKey, weekday, person.prefs.timeZone);
    if (!shift) continue;
    if (person.prefs.onArrive && arriveDue(now, shift) && (await sendArrive(person.staffName, dayKey, weekday))) sent++;
    if (person.prefs.onClose && closeDue(now, shift) && (await sendClose(person.staffName, dayKey, weekday))) sent++;
  }
  return { sent };
}
