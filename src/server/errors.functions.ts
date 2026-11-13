import { requireOwner, requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  clearAllErrors,
  clearError,
  countRecentErrors,
  findErrors,
  pruneErrors,
  recordError,
} from "./errors.server.js";

/** Writes down an error the app couldn't handle, so Settings can show it. */
export const reportAppError = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      message: z.string().min(1).max(300),
      where: z.string().max(60).default(""),
      detail: z.string().max(1200).default(""),
      device: z.string().max(80).default(""),
      staffName: z.string().max(60).default(""),
    }),
  )
  .handler(async ({ data }) => {
    await recordError(data);
    return { ok: true };
  });

/** Recent breakage for Settings → Help & support. */
export const getAppErrors = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => ({
    errors: await findErrors(50),
    recentCount: await countRecentErrors(7),
  }));

/** Marks one problem as dealt with, or clears the lot. */
export const dismissAppError = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .inputValidator(z.object({ id: z.number().int().positive().nullable() }))
  .handler(async ({ data }) => {
    if (data.id === null) await clearAllErrors();
    else await clearError(data.id);
    await pruneErrors();
    return { ok: true };
  });
