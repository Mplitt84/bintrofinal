import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  deleteCalendarEvent,
  ensureCalendarToken,
  findCalendarEvents,
  insertCalendarEvents,
  updateCalendarEvent,
} from "./calendar.server.js";
import { assertFeature } from "./account.server.js";

const EventSchema = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["reorder", "delivery", "bill", "tax", "count", "task"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^(\d{2}:\d{2})?$/),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  repeat: z.enum(["none", "weekly", "monthly", "quarterly", "yearly"]),
  notes: z.string().max(2000),
  staffName: z.string().max(60),
});

export const listCalendarEvents = createServerFn({ method: "GET" }).handler(async () => {
  return findCalendarEvents();
});

export const addCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator(z.object({ items: z.array(EventSchema).min(1).max(20) }))
  .handler(async ({ data }) => {
    await assertFeature("calendar");
    return insertCalendarEvents(data.items);
  });

export const editCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator(EventSchema.partial().extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    return updateCalendarEvent(id, rest);
  });

export const removeCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    return deleteCalendarEvent(data.id);
  });

/** Path of the live iCal feed. `reset` issues a new link and retires the old one. */
export const getCalendarFeedPath = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reset: z.boolean().optional() }))
  .handler(async ({ data }) => {
    await assertFeature("calendar");
    const token = await ensureCalendarToken(Boolean(data.reset));
    return { path: `/api/calendar/${token}.ics` };
  });
