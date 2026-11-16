import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { HK_ICONS, HK_TONES } from "../lib/housekeeping.js";
import { loadPrefs, pushToStaff, removeSubscription, savePrefs, saveSubscription, vapidKeys } from "./push.server.js";
import {
  addTask,
  checkTask,
  deleteTask,
  dismissReminder,
  loadBoard,
  openReminders,
  stationTaskId,
  undoCheck,
  updateTask,
} from "./housekeeping.server.js";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Name = z.string().trim().min(1).max(60);
const TaskFields = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.enum(HK_ICONS),
  tone: z.enum(HK_TONES),
  cadence: z.enum(["client", "open", "daily", "close"]),
  scope: z.enum(["each", "shop"]),
  role: z.enum(["artist", "inventory"]),
  assign: z.enum(["everyone", "rotate", "assigned"]),
  assignees: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
  why: z.string().max(140),
  repeat: z
    .object({
      kind: z.enum(["daily", "days", "weeks", "interval", "monthly"]),
      days: z.array(z.number().int().min(0).max(6)).max(7),
      every: z.number().int().min(1).max(52),
      anchor: z.union([Day, z.literal("")]),
      monthDay: z.number().int().min(1).max(31),
      flex: z.boolean(),
    })
    .optional(),
});

/** The day's board: jobs, recent taps, open checkout reminders and the team. */
export const getHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ dayKey: Day, weekday: z.number().int().min(0).max(6) }))
  .handler(async ({ data }) => loadBoard(data.dayKey, data.weekday));

export const checkHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      taskId: z.number().int(),
      staffName: Name,
      dayKey: Day,
      reminderId: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const added = await checkTask(data);
      return { ok: true as const, added };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t save that." };
    }
  });

export const undoHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ checkId: z.number().int(), staffName: Name, dayKey: Day }))
  .handler(async ({ data }) => {
    try {
      await undoCheck(data.checkId, data.staffName, data.dayKey);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t take that back." };
    }
  });

export const dismissHousekeepingReminder = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int(), staffName: Name }))
  .handler(async ({ data }) => {
    await dismissReminder(data.id, data.staffName);
    return { ok: true as const };
  });

/** Owners shape the list: add their own jobs, restyle, hide or remove them. */
export const addHousekeepingTask = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(TaskFields)
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, tasks: await addTask(data) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t add that job." };
    }
  });

export const updateHousekeepingTask = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ id: z.number().int(), patch: TaskFields.partial().extend({ active: z.boolean().optional() }) }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, tasks: await updateTask(data.id, data.patch) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t save that job." };
    }
  });

export const deleteHousekeepingTask = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => ({ ok: true as const, tasks: await deleteTask(data.id) }));

/** For the app-wide checkout nudge: open reminders and the job a reset ticks off. Light, polled often. */
export const getCheckoutReminders = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ reminders: await openReminders(), stationTaskId: await stationTaskId() }));

// ---------------------------------------------------------------------------
// Reminders: each person's schedule, switches and phones
// ---------------------------------------------------------------------------

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const getReminderSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ staffName: Name }))
  .handler(async ({ data }) => ({ ...(await loadPrefs(data.staffName)), publicKey: (await vapidKeys()).publicKey }));

export const saveReminderSettings = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      staffName: Name,
      prefs: z.object({
        enabled: z.boolean(),
        onArrive: z.boolean(),
        onClient: z.boolean(),
        onClose: z.boolean(),
        source: z.enum(["square", "schedule"]),
        timeZone: z.string().min(1).max(60),
      }),
      schedule: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: Time, end: Time })).max(7),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, settings: await savePrefs(data.staffName, data.prefs, data.schedule) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t save your reminders." };
    }
  });

/** This phone starts (or stops) getting reminders for a team member; a test one goes out right away. */
export const subscribePhone = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({ staffName: Name, endpoint: z.string().url().max(1000), p256dh: z.string().max(200), auth: z.string().max(100), userAgent: z.string().max(300) }),
  )
  .handler(async ({ data }) => {
    await saveSubscription(data.staffName, data, data.userAgent);
    await pushToStaff(data.staffName, {
      title: "Reminders are on ✨",
      body: "You’ll get a nudge when you arrive, after each checkout and when it’s time to close out.",
      tag: "welcome",
    });
    return { ok: true as const };
  });

export const unsubscribePhone = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ endpoint: z.string().max(1000) }))
  .handler(async ({ data }) => {
    await removeSubscription(data.endpoint);
    return { ok: true as const };
  });
