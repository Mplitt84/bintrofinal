import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { computeShowstopper, saveGoal } from "./showstopper.server.js";
import { saveBusinessProfile } from "./business.server.js";

const When = z.string().datetime({ offset: true }).or(z.string().datetime());

/** One period of Showstopper: every team member's retail, badges, goal and tips. */
export const getShowstopper = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      periodLabel: z.string().max(40),
      start: When,
      end: When,
      prevStart: When,
      prevEnd: When,
      goalKey: z.string().regex(/^\d{4}-\d{2}$/),
    }),
  )
  .handler(async ({ data }) =>
    computeShowstopper({
      periodLabel: data.periodLabel,
      start: new Date(data.start),
      end: new Date(data.end),
      prevStart: new Date(data.prevStart),
      prevEnd: new Date(data.prevEnd),
      goalKey: data.goalKey,
    }),
  );

/** Set (or clear) what somebody is aiming at this month, and the habits they picked. */
export const setRetailGoal = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      staffName: z.string().min(1).max(60),
      periodKey: z.string().regex(/^\d{4}-\d{2}$/),
      targetCents: z.number().int().min(0).max(100_000_00),
      focusTips: z.array(z.string().max(40)).max(3),
      setBy: z.string().max(60).default(""),
    }),
  )
  .handler(async ({ data }) => {
    await saveGoal(data);
    return { ok: true as const };
  });

/** The share of retail a team member earns. Owner-only: it is a pay decision. */
export const setRetailCommission = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ pct: z.number().int().min(0).max(100) }))
  .handler(async ({ data }) => saveBusinessProfile({ retailCommissionPct: data.pct }));
