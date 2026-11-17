import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SCAN_PER_TAP } from "../lib/better-prices.js";
import { hasFeature } from "./account.server.js";
import { requireUser } from "./auth.middleware";
import { saveBusinessProfile } from "./business.server.js";
import { betterPricesState, runPriceScan, setOfferStatus, switchToOffer, undoSwitch } from "./better-prices.server.js";

/** Open offers, total monthly saving, the shop's buying preference and when it last looked. */
export const getBetterPrices = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ ...(await betterPricesState()), canScan: await hasFeature("ai") }));

export const setBuyingPreference = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ preference: z.enum(["pro", "local", "marketplace"]) }))
  .handler(async ({ data }) => {
    await saveBusinessProfile({ buyingPreference: data.preference });
    return betterPricesState();
  });

/** "Check prices now": a few products at a time, the ones the weekly scan would do next. */
export const scanPricesNow = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async () => {
    if (!(await hasFeature("ai"))) return { ok: false as const, message: "Price checks come with Plus." };
    const run = await runPriceScan(SCAN_PER_TAP);
    return { ok: true as const, run, state: await betterPricesState() };
  });

export const switchSeller = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int().positive(), staffName: z.string().max(60) }))
  .handler(async ({ data }) => {
    try {
      const before = await switchToOffer(data.id, data.staffName || "Someone");
      return { ok: true as const, before, state: await betterPricesState() };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn't switch." };
    }
  });

export const undoSwitchSeller = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      before: z.object({ productId: z.number().int().positive(), vendor: z.string().max(200), unitCostCents: z.number().int().min(0) }),
    }),
  )
  .handler(async ({ data }) => {
    await undoSwitch(data.id, data.before);
    return betterPricesState();
  });

export const dismissOffer = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int().positive(), undo: z.boolean().default(false), staffName: z.string().max(60) }))
  .handler(async ({ data }) => {
    await setOfferStatus(data.id, data.undo ? "new" : "dismissed", data.staffName || "Someone");
    return betterPricesState();
  });
