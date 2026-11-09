import { c as createServerFn } from "../server.js";
import { c as pingAI } from "./product-lookup.server-C6LGgHTN.js";
import { s as stripeCheck, n as pilotPremium } from "./account.server-IhIPs_LL.js";
import { e as emailSetup, c as sendTestEmail } from "./email.server-2uKsRAsj.js";
import { f as findBusinessProfile } from "./business.server-CHGYL_45.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "node:crypto";
import "drizzle-orm";
import "./index-CaPewqP7.js";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./inventory-defaults-BnRHgx1T.js";
import "./business-types-DKNVcfJE.js";
import "./purchase-order-1ZyUH4cu.js";
const has = (name) => Boolean(process.env[name]?.trim());
const runSetupCheck_createServerFn_handler = createServerRpc({
  id: "ea9f790698f1189cb2e2cf233b4ddd8e322b014389ba3ee23a7125e6aaaaf206",
  name: "runSetupCheck",
  filename: "src/server/setup.functions.ts"
}, (opts) => runSetupCheck.__executeServer(opts));
const runSetupCheck = createServerFn({
  method: "POST"
}).handler(runSetupCheck_createServerFn_handler, async () => {
  const [ai, stripe] = await Promise.all([pingAI(), stripeCheck()]);
  return {
    pilot: pilotPremium(),
    ai,
    stripe,
    email: emailSetup(),
    square: has("SQUARE_APPLICATION_ID") && has("SQUARE_APPLICATION_SECRET"),
    quickbooks: (has("QUICKBOOKS_CLIENT_ID") || has("QB_CLIENT_ID") || has("QB_ClIENT_ID")) && (has("QUICKBOOKS_CLIENT_SECRET") || has("QB_CLIENT_SECRET"))
  };
});
const sendSetupTestEmail_createServerFn_handler = createServerRpc({
  id: "7822646cdc4c07d7fe54cfea331ae87fad27976b90595edf54479615467c2220",
  name: "sendSetupTestEmail",
  filename: "src/server/setup.functions.ts"
}, (opts) => sendSetupTestEmail.__executeServer(opts));
const sendSetupTestEmail = createServerFn({
  method: "POST"
}).handler(sendSetupTestEmail_createServerFn_handler, async () => {
  const result = await sendTestEmail(await findBusinessProfile());
  return result.ok ? {
    ok: true,
    to: result.to
  } : {
    ok: false,
    message: result.message
  };
});
export {
  runSetupCheck_createServerFn_handler,
  sendSetupTestEmail_createServerFn_handler
};
