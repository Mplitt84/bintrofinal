import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { f as findCalendarEvents, a as insertCalendarEvents, u as updateCalendarEvent, d as deleteCalendarEvent, e as ensureCalendarToken } from "./calendar.server-Ao_GjwJ3.js";
import { d as assertFeature } from "./account.server-IhIPs_LL.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm";
import "node:crypto";
import "./index-CaPewqP7.js";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./business-types-DKNVcfJE.js";
const EventSchema = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["reorder", "delivery", "bill", "tax", "count", "task"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^(\d{2}:\d{2})?$/),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  repeat: z.enum(["none", "weekly", "monthly", "quarterly", "yearly"]),
  notes: z.string().max(2e3),
  staffName: z.string().max(60)
});
const listCalendarEvents_createServerFn_handler = createServerRpc({
  id: "fb2642136d6b78e714db8653b5c190b16782fb5dee0febafe5407086cd6baadc",
  name: "listCalendarEvents",
  filename: "src/server/calendar.functions.ts"
}, (opts) => listCalendarEvents.__executeServer(opts));
const listCalendarEvents = createServerFn({
  method: "GET"
}).handler(listCalendarEvents_createServerFn_handler, async () => {
  return findCalendarEvents();
});
const addCalendarEvents_createServerFn_handler = createServerRpc({
  id: "d01f692499371e7e595b4b8de4522fd0640e38219158e89b6abb9e16cf52a436",
  name: "addCalendarEvents",
  filename: "src/server/calendar.functions.ts"
}, (opts) => addCalendarEvents.__executeServer(opts));
const addCalendarEvents = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  items: z.array(EventSchema).min(1).max(20)
})).handler(addCalendarEvents_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("calendar");
  return insertCalendarEvents(data.items);
});
const editCalendarEvent_createServerFn_handler = createServerRpc({
  id: "3d6c39e18a4a9218d6622b186dcc7152b9c7b750c35ece382031bb9b8abbd6e5",
  name: "editCalendarEvent",
  filename: "src/server/calendar.functions.ts"
}, (opts) => editCalendarEvent.__executeServer(opts));
const editCalendarEvent = createServerFn({
  method: "POST"
}).inputValidator(EventSchema.partial().extend({
  id: z.number().int()
})).handler(editCalendarEvent_createServerFn_handler, async ({
  data
}) => {
  const {
    id,
    ...rest
  } = data;
  return updateCalendarEvent(id, rest);
});
const removeCalendarEvent_createServerFn_handler = createServerRpc({
  id: "d8417f701b27e33db653c9f29e66202992c3a531f6ce27af902b7c5611920a07",
  name: "removeCalendarEvent",
  filename: "src/server/calendar.functions.ts"
}, (opts) => removeCalendarEvent.__executeServer(opts));
const removeCalendarEvent = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.number().int()
})).handler(removeCalendarEvent_createServerFn_handler, async ({
  data
}) => {
  return deleteCalendarEvent(data.id);
});
const getCalendarFeedPath_createServerFn_handler = createServerRpc({
  id: "2b4b237bff79856c01bb15351d679549b72f1cb75bc34ff6ae694c5c4ee39a0b",
  name: "getCalendarFeedPath",
  filename: "src/server/calendar.functions.ts"
}, (opts) => getCalendarFeedPath.__executeServer(opts));
const getCalendarFeedPath = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  reset: z.boolean().optional()
})).handler(getCalendarFeedPath_createServerFn_handler, async ({
  data
}) => {
  await assertFeature("calendar");
  const token = await ensureCalendarToken(Boolean(data.reset));
  return {
    path: `/api/calendar/${token}.ics`
  };
});
export {
  addCalendarEvents_createServerFn_handler,
  editCalendarEvent_createServerFn_handler,
  getCalendarFeedPath_createServerFn_handler,
  listCalendarEvents_createServerFn_handler,
  removeCalendarEvent_createServerFn_handler
};
