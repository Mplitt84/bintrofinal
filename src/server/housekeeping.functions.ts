import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { HK_ICONS, HK_TONES } from "../lib/housekeeping.js";
import {
  addTask,
  checkTask,
  deleteTask,
  dismissReminder,
  loadBoard,
  setCommitment,
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
  cadence: z.enum(["client", "open", "daily", "close", "weekly"]),
  scope: z.enum(["each", "shop"]),
  required: z.boolean(),
  role: z.enum(["artist", "inventory"]),
  why: z.string().max(140),
});

/** The day's board: jobs, today's taps, the week's taps, open checkout reminders and the team. */
export const getHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ dayKey: Day, weekKeys: z.array(Day).max(7) }))
  .handler(async ({ data }) => loadBoard(data.dayKey, data.weekKeys));

export const checkHousekeeping = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      taskId: z.number().int(),
      staffName: Name,
      dayKey: Day,
      weekKeys: z.array(Day).max(7).optional(),
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

/** A team member takes on (or lets go of) an optional job. Anyone can choose for themselves. */
export const setHousekeepingCommitment = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ staffName: Name, taskId: z.number().int(), on: z.boolean() }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, commitments: await setCommitment(data.staffName, data.taskId, data.on) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t save that." };
    }
  });
