import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { listSchedules, reassignScans, saveSchedule, scanRows } from "./scan-check.server.js";

const Day = z.object({ weekday: z.number().int().min(0).max(6), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) });
const key = (s: string) => s.trim().toLowerCase();

export const getSchedules = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ schedules: await listSchedules() }));

/** A team member saves their own week; an owner can save anyone's. */
export const saveScheduleFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ staffName: z.string().trim().min(1).max(60), days: z.array(Day).max(7) }))
  .handler(async ({ data, context }) => {
    const u = context.user;
    if (u && u.role !== "owner" && key(u.teamName || u.name || "") !== key(data.staffName)) {
      return { ok: false as const, message: "You can set your own schedule. Ask the owner to change someone else’s." };
    }
    return { ok: true as const, schedules: await saveSchedule(data.staffName, data.days) };
  });

/** Owner: the last N days of scans with who was signed in, and everyone's schedule. Flags are worked out on the device (local time). */
export const getScanCheck = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ days: z.number().int().min(1).max(90) }))
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.days * 86_400_000);
    const [rows, schedules] = await Promise.all([scanRows(since), listSchedules()]);
    return { rows, schedules };
  });

export const reassignScansFn = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ ids: z.array(z.number().int()).min(1).max(500), staffName: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await reassignScans(data.ids, data.staffName)) };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t move those scans." };
    }
  });
