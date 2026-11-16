/**
 * Phone reminders over Web Push (server-only). The site's key pair is made on first
 * use and kept in `push_keys`, so nothing has to be set up in Netlify. Each team
 * member's phones are rows in `push_subscriptions`; a phone that has gone away
 * (404 / 410 from its push service) is forgotten.
 */
import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "../../db/index.js";
import { pushKeys, pushSubscriptions, reminderLog, staffReminderPrefs, staffSchedules } from "../../db/schema.js";
import { nameKey } from "../lib/housekeeping.js";
import { DEFAULT_PREFS, isTime, type ReminderPrefs, type ScheduleDay } from "../lib/schedule.js";
import { mine, owned } from "./tenant.js";

let cached: { publicKey: string; privateKey: string } | null = null;

/** The site's VAPID keys, created once. */
export async function vapidKeys() {
  if (cached) return cached;
  let [row] = await db.select().from(pushKeys).where(eq(pushKeys.id, 1));
  if (!row) {
    const made = webpush.generateVAPIDKeys();
    await db.insert(pushKeys).values({ id: 1, publicKey: made.publicKey, privateKey: made.privateKey }).onConflictDoNothing();
    [row] = await db.select().from(pushKeys).where(eq(pushKeys.id, 1));
  }
  cached = { publicKey: row.publicKey, privateKey: row.privateKey };
  return cached;
}

export async function saveSubscription(staffName: string, sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string) {
  // A phone belongs to whoever turned reminders on last.
  await db
    .insert(pushSubscriptions)
    .values({ ...owned(), staffName: staffName.trim(), endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, userAgent: userAgent.slice(0, 200) })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { ...owned(), staffName: staffName.trim(), p256dh: sub.p256dh, auth: sub.auth },
    });
}

export async function removeSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(and(mine(pushSubscriptions), eq(pushSubscriptions.endpoint, endpoint)));
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

/** Sends to every phone a team member turned reminders on for. Returns how many went. */
export async function pushToStaff(staffName: string, message: PushMessage) {
  const keys = await vapidKeys();
  const subs = (await db.select().from(pushSubscriptions).where(mine(pushSubscriptions))).filter(
    (s) => nameKey(s.staffName) === nameKey(staffName),
  );
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ url: "/#housekeeping", ...message }),
        { vapidDetails: { subject: "mailto:hello@bintroapp.com", publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 3600 },
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await removeSubscription(s.endpoint);
      else console.error("Push failed", status, error);
    }
  }
  return sent;
}

/** Records a reminder as sent; false when it already went (so each one goes once). */
export async function claimReminder(staffName: string, kind: "arrive" | "client" | "close", ref: string) {
  const rows = await db
    .insert(reminderLog)
    .values({ ...owned(), staffName, kind, ref })
    .onConflictDoNothing()
    .returning({ id: reminderLog.id });
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Each team member's reminder settings and usual week
// ---------------------------------------------------------------------------

export type StaffReminderSettings = ReminderPrefs & { staffName: string; schedule: ScheduleDay[]; phones: number };

export async function loadPrefs(staffName: string): Promise<StaffReminderSettings> {
  const [prefRows, days, subs] = await Promise.all([
    db.select().from(staffReminderPrefs).where(mine(staffReminderPrefs)),
    db.select().from(staffSchedules).where(mine(staffSchedules)),
    db.select({ staffName: pushSubscriptions.staffName }).from(pushSubscriptions).where(mine(pushSubscriptions)),
  ]);
  const me = nameKey(staffName);
  const p = prefRows.find((r) => nameKey(r.staffName) === me);
  return {
    staffName,
    enabled: p?.enabled ?? DEFAULT_PREFS.enabled,
    onArrive: p?.onArrive ?? DEFAULT_PREFS.onArrive,
    onClient: p?.onClient ?? DEFAULT_PREFS.onClient,
    onClose: p?.onClose ?? DEFAULT_PREFS.onClose,
    source: (p?.source === "square" ? "square" : "schedule") as ReminderPrefs["source"],
    timeZone: p?.timeZone ?? DEFAULT_PREFS.timeZone,
    schedule: days
      .filter((d) => nameKey(d.staffName) === me)
      .map((d) => ({ weekday: d.weekday, start: d.start, end: d.end }))
      .sort((a, b) => a.weekday - b.weekday),
    phones: subs.filter((s) => nameKey(s.staffName) === me).length,
  };
}

export async function savePrefs(staffName: string, prefs: ReminderPrefs, schedule: ScheduleDay[]) {
  const name = staffName.trim();
  if (!name) throw new Error("Pick who you are first.");
  for (const d of schedule) {
    if (!isTime(d.start) || !isTime(d.end) || d.end <= d.start) throw new Error("Each working day needs a start time before its end time.");
  }
  await db
    .insert(staffReminderPrefs)
    .values({ ...owned(), staffName: name, ...prefs, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [staffReminderPrefs.businessId, staffReminderPrefs.staffName],
      set: { ...prefs, updatedAt: new Date() },
    });
  const existing = await db.select({ id: staffSchedules.id, staffName: staffSchedules.staffName }).from(staffSchedules).where(mine(staffSchedules));
  const mineIds = existing.filter((r) => nameKey(r.staffName) === nameKey(name)).map((r) => r.id);
  for (const id of mineIds) await db.delete(staffSchedules).where(and(mine(staffSchedules), eq(staffSchedules.id, id)));
  if (schedule.length) {
    await db.insert(staffSchedules).values(schedule.map((d) => ({ ...owned(), staffName: name, weekday: d.weekday, start: d.start, end: d.end })));
  }
  return loadPrefs(name);
}

/** Everyone with reminders turned on and at least one phone: who the scheduled job looks at. */
export async function remindable() {
  const [prefRows, subs, days] = await Promise.all([
    db.select().from(staffReminderPrefs).where(mine(staffReminderPrefs)),
    db.select({ staffName: pushSubscriptions.staffName }).from(pushSubscriptions).where(mine(pushSubscriptions)),
    db.select().from(staffSchedules).where(mine(staffSchedules)),
  ]);
  const withPhones = new Set(subs.map((s) => nameKey(s.staffName)));
  return prefRows
    .filter((p) => p.enabled && withPhones.has(nameKey(p.staffName)))
    .map((p) => ({
      staffName: p.staffName,
      prefs: { enabled: p.enabled, onArrive: p.onArrive, onClient: p.onClient, onClose: p.onClose, source: p.source === "square" ? "square" : "schedule", timeZone: p.timeZone } as ReminderPrefs,
      schedule: days.filter((d) => nameKey(d.staffName) === nameKey(p.staffName)).map((d) => ({ weekday: d.weekday, start: d.start, end: d.end })),
    }));
}

/** Whether checkout reminders should reach this person's phone. */
export async function wantsClientPush(staffName: string) {
  const [p] = (await db.select().from(staffReminderPrefs).where(mine(staffReminderPrefs))).filter((r) => nameKey(r.staffName) === nameKey(staffName));
  return p ? p.enabled && p.onClient : DEFAULT_PREFS.onClient;
}

