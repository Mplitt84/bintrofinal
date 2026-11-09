import { r as requireUser } from "./auth.middleware-2uPScvPU.js";
import { c as createServerFn, a as getRequest } from "../server.js";
import { z } from "zod";
import { g as getAccountSummary, l as listBillingHistory, u as updateAccountDetails, P as PAUSE_OPTIONS, e as PlanLimitError, f as lockInFoundingRate, p as pauseBilling, r as resumeBilling, i as cancelPlan, j as paymentPortalUrl, k as changePlan } from "./account.server-Dnxw0Aoe.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:crypto";
import "drizzle-orm";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
function origin() {
  return new URL(getRequest().url).origin;
}
async function attempt(fn) {
  try {
    return {
      ok: true,
      result: await fn()
    };
  } catch (error) {
    if (!(error instanceof PlanLimitError)) console.error("Billing error", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Something went wrong."
    };
  }
}
const getAccount_createServerFn_handler = createServerRpc({
  id: "afea1878bf48c9086830abe85f18bb485adeac1742249bf8e1bfb35363956c8f",
  name: "getAccount",
  filename: "src/server/account.functions.ts"
}, (opts) => getAccount.__executeServer(opts));
const getAccount = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getAccount_createServerFn_handler, async () => {
  return getAccountSummary();
});
const getBillingHistory_createServerFn_handler = createServerRpc({
  id: "3bea34e8c3b0fbfe52545d91d30315224f93624ae4b9e5a4801b9e9893879d01",
  name: "getBillingHistory",
  filename: "src/server/account.functions.ts"
}, (opts) => getBillingHistory.__executeServer(opts));
const getBillingHistory = createServerFn({
  method: "GET"
}).middleware([requireUser]).handler(getBillingHistory_createServerFn_handler, async () => {
  return listBillingHistory();
});
const saveAccountDetails_createServerFn_handler = createServerRpc({
  id: "43cc7a8edb98bd999075fb69ecbbb34bb9603d834247277daa3e9d5bdad38a20",
  name: "saveAccountDetails",
  filename: "src/server/account.functions.ts"
}, (opts) => saveAccountDetails.__executeServer(opts));
const saveAccountDetails = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  ownerName: z.string().trim().max(120).optional(),
  billingEmail: z.string().trim().max(200).optional()
})).handler(saveAccountDetails_createServerFn_handler, async ({
  data
}) => {
  return updateAccountDetails(data);
});
const selectPlan_createServerFn_handler = createServerRpc({
  id: "b76fbe18471cd9060d1161ee22d718be183f5851c634a1406326b22726b2ede7",
  name: "selectPlan",
  filename: "src/server/account.functions.ts"
}, (opts) => selectPlan.__executeServer(opts));
const selectPlan = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  plan: z.enum(["free", "plus", "premium"]),
  interval: z.enum(["month", "year"])
})).handler(selectPlan_createServerFn_handler, async ({
  data
}) => {
  return attempt(() => changePlan(data.plan, data.interval, origin()));
});
const lockInFounding_createServerFn_handler = createServerRpc({
  id: "fe93a3ad77c54a209c7c8881b54a5c6ae2b24476e2d00d3d589e925a6176595c",
  name: "lockInFounding",
  filename: "src/server/account.functions.ts"
}, (opts) => lockInFounding.__executeServer(opts));
const lockInFounding = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  plan: z.enum(["plus", "premium"]),
  interval: z.enum(["month", "year"])
})).handler(lockInFounding_createServerFn_handler, async ({
  data
}) => {
  return attempt(() => lockInFoundingRate(data.plan, data.interval, origin()));
});
const pausePlan_createServerFn_handler = createServerRpc({
  id: "1ad1730f395b5a8a4dc266d462ed91565b3e66792291cdcf5ab21e2547b6aa89",
  name: "pausePlan",
  filename: "src/server/account.functions.ts"
}, (opts) => pausePlan.__executeServer(opts));
const pausePlan = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  months: z.number().int().refine((m) => PAUSE_OPTIONS.includes(m))
})).handler(pausePlan_createServerFn_handler, async ({
  data
}) => {
  return attempt(() => pauseBilling(data.months));
});
const resumePlan_createServerFn_handler = createServerRpc({
  id: "59cca0435fb18284b1ca3d80b0a4eb25f62f617a7027a7fce94638dbe403bad2",
  name: "resumePlan",
  filename: "src/server/account.functions.ts"
}, (opts) => resumePlan.__executeServer(opts));
const resumePlan = createServerFn({
  method: "POST"
}).middleware([requireUser]).handler(resumePlan_createServerFn_handler, async () => {
  return attempt(resumeBilling);
});
const cancelSubscription_createServerFn_handler = createServerRpc({
  id: "c25a68e26f74554b1b179308fba30707ad90eeaf434a3e5f00ab8ec420ffbd3e",
  name: "cancelSubscription",
  filename: "src/server/account.functions.ts"
}, (opts) => cancelSubscription.__executeServer(opts));
const cancelSubscription = createServerFn({
  method: "POST"
}).middleware([requireUser]).inputValidator(z.object({
  reason: z.string().trim().max(500)
})).handler(cancelSubscription_createServerFn_handler, async ({
  data
}) => {
  return attempt(() => cancelPlan(data.reason));
});
const openPaymentPortal_createServerFn_handler = createServerRpc({
  id: "0b508838fc462dd380fc8fc0ca7b8b04751230c28fd33cada81ad988012d63c1",
  name: "openPaymentPortal",
  filename: "src/server/account.functions.ts"
}, (opts) => openPaymentPortal.__executeServer(opts));
const openPaymentPortal = createServerFn({
  method: "POST"
}).middleware([requireUser]).handler(openPaymentPortal_createServerFn_handler, async () => {
  return attempt(() => paymentPortalUrl(origin()));
});
export {
  cancelSubscription_createServerFn_handler,
  getAccount_createServerFn_handler,
  getBillingHistory_createServerFn_handler,
  lockInFounding_createServerFn_handler,
  openPaymentPortal_createServerFn_handler,
  pausePlan_createServerFn_handler,
  resumePlan_createServerFn_handler,
  saveAccountDetails_createServerFn_handler,
  selectPlan_createServerFn_handler
};
