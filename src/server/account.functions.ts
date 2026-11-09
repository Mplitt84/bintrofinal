import { requireUser } from "./auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  PlanLimitError,
  cancelPlan,
  changePlan,
  getAccountSummary,
  lockInFoundingRate,
  listBillingHistory,
  pauseBilling,
  paymentPortalUrl,
  resumeBilling,
  updateAccountDetails,
  type BillingResult,
} from "./account.server.js";
import { PAUSE_OPTIONS } from "../lib/plans.js";

function origin() {
  return new URL(getRequest().url).origin;
}

/** Billing calls return a message instead of throwing, so the UI can show what went wrong. */
async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; result: T } | { ok: false; message: string }> {
  try {
    return { ok: true, result: await fn() };
  } catch (error) {
    if (!(error instanceof PlanLimitError)) console.error("Billing error", error);
    return { ok: false, message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export const getAccount = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => {
  return getAccountSummary();
});

export const getBillingHistory = createServerFn({ method: "GET" }).middleware([requireUser]).handler(async () => {
  return listBillingHistory();
});

export const saveAccountDetails = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(
    z.object({
      ownerName: z.string().trim().max(120).optional(),
      billingEmail: z.string().trim().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    return updateAccountDetails(data);
  });

export const selectPlan = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ plan: z.enum(["free", "plus", "premium"]), interval: z.enum(["month", "year"]) }))
  .handler(async ({ data }) => {
    return attempt<BillingResult>(() => changePlan(data.plan, data.interval, origin()));
  });

/** Pilot testers: lock in the founding rate now; billing starts when the free pilot ends. */
export const lockInFounding = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ plan: z.enum(["plus", "premium"]), interval: z.enum(["month", "year"]) }))
  .handler(async ({ data }) => {
    return attempt<BillingResult>(() => lockInFoundingRate(data.plan, data.interval, origin()));
  });

export const pausePlan = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ months: z.number().int().refine((m) => (PAUSE_OPTIONS as readonly number[]).includes(m)) }))
  .handler(async ({ data }) => {
    return attempt<BillingResult>(() => pauseBilling(data.months));
  });

export const resumePlan = createServerFn({ method: "POST" }).middleware([requireUser]).handler(async () => {
  return attempt<BillingResult>(resumeBilling);
});

export const cancelSubscription = createServerFn({ method: "POST" }).middleware([requireUser])
  .inputValidator(z.object({ reason: z.string().trim().max(500) }))
  .handler(async ({ data }) => {
    return attempt<BillingResult>(() => cancelPlan(data.reason));
  });

export const openPaymentPortal = createServerFn({ method: "POST" }).middleware([requireUser]).handler(async () => {
  return attempt(() => paymentPortalUrl(origin()));
});
