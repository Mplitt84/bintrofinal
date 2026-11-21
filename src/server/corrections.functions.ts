import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner } from "./auth.middleware";
import { listCorrections, refileCorrections } from "./corrections.server.js";
import { EDITABLE_REASONS } from "../lib/corrections.js";

/** Owner: the corrections behind "Lost to corrections" for a window (local edges from the device). */
export const getCorrections = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ start: z.string(), end: z.string() }))
  .handler(async ({ data }) => ({ rows: await listCorrections(new Date(data.start), new Date(data.end)) }));

export const refileCorrectionsFn = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ ids: z.array(z.number().int()).min(1).max(2000), reason: z.enum(EDITABLE_REASONS) }))
  .handler(async ({ data }) => refileCorrections(data.ids, data.reason));
