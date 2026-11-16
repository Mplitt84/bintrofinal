import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.middleware";
import { deleteMix, deletePartner, deleteWasteLog, listMixes, listPartners, listWasteLogs, saveMix, savePartner, saveWasteLog } from "./sustainability.server.js";

const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const fail = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof Error ? error.message : fallback,
});

export const getSustainability = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => {
    const [partners, logs, mixes] = await Promise.all([listPartners(), listWasteLogs(), listMixes()]);
    return { partners, logs, mixes };
  });

export const savePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      id: z.number().int().optional(),
      name: z.string().trim().min(1).max(80),
      kind: z.enum(["recycling", "certification", "donation", "supplier", "other"]),
      contact: z.string().max(120),
      website: z.string().max(200),
      since: Month.or(z.literal("")),
      notes: z.string().max(400),
      addedBy: z.string().max(60),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { addedBy, ...input } = data;
      return { ok: true as const, partners: await savePartner(input, addedBy) };
    } catch (error) {
      return fail(error, "Couldn’t save that partner.");
    }
  });

export const deletePartnerFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => ({ ok: true as const, partners: await deletePartner(data.id) }));

export const saveWasteLogFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      month: Month,
      grams: z.number().int().min(0).max(10_000_000),
      costCentsPerOz: z.number().int().min(0).max(100_000),
      note: z.string().max(300),
      loggedBy: z.string().max(60),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const { loggedBy, ...input } = data;
      return { ok: true as const, logs: await saveWasteLog(input, loggedBy) };
    } catch (error) {
      return fail(error, "Couldn’t save that month.");
    }
  });

export const deleteWasteLogFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => ({ ok: true as const, logs: await deleteWasteLog(data.id) }));

const Oz = z.number().min(0).max(10_000);
const Parts = z.number().min(0).max(100);

export const saveMixFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      id: z.number().int().optional(),
      name: z.string().trim().min(1).max(60),
      colorCents: z.number().int().min(0).max(1_000_000),
      colorOz: Oz,
      developerCents: z.number().int().min(0).max(1_000_000),
      developerOz: Oz,
      colorParts: Parts,
      developerParts: Parts,
    }),
  )
  .handler(async ({ data }) => {
    try {
      return { ok: true as const, mixes: await saveMix(data) };
    } catch (error) {
      return fail(error, "Couldn’t save that color line.");
    }
  });

export const deleteMixFn = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => ({ ok: true as const, mixes: await deleteMix(data.id) }));
