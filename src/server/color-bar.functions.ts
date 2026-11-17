import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { deleteBowl, deleteService, loadColorBar, saveBowl, saveColorBarSettings, saveService } from "./color-bar.server.js";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fail = (error: unknown, fallback: string) => ({ ok: false as const, message: error instanceof Error ? error.message : fallback });

export const getColorBar = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ since: Day }))
  .handler(async ({ data }) => loadColorBar(data.since));

export const saveServiceFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      id: z.number().int().optional(),
      name: z.string().trim().min(1).max(80),
      priceCents: z.number().int().min(0).max(10_000_000),
      minutes: z.number().int().min(0).max(1440),
      productCents: z.number().int().min(0).max(1_000_000),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await saveService(data)) };
    } catch (error) {
      return fail(error, "Couldn’t save that service.");
    }
  });

export const deleteServiceFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => deleteService(data.id));

export const saveBowlFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      dayKey: Day,
      clientName: z.string().max(80),
      serviceId: z.number().int().nullable(),
      staffName: z.string().max(60),
      lines: z.array(z.object({ productId: z.number().int().nullable(), name: z.string().max(120), grams: z.number().min(0).max(5000) })).max(20),
      leftoverGrams: z.number().min(0).max(5000),
      chargedCents: z.number().int().min(0).max(1_000_000),
      note: z.string().max(500),
      addToRecord: z.object({ kind: z.enum(["hair", "tattoo"]) }).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, ...(await saveBowl(data)) };
    } catch (error) {
      return fail(error, "Couldn’t save that bowl.");
    }
  });

export const deleteBowlFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => deleteBowl(data.id));

/** Labor cost per hour and product markup are owner-only: they describe pay and pricing. */
export const saveColorBarSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ laborCentsPerHour: z.number().int().min(0).max(100_000).optional(), productMarkupPct: z.number().int().min(0).max(500).optional() }))
  .handler(async ({ data }) => saveColorBarSettings(data));
