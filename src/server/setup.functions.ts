import { createServerFn } from "@tanstack/react-start";
import { pingAI } from "./product-lookup.server.js";
import { pilotPremium, stripeCheck } from "./account.server.js";
import { emailSetup, sendTestEmail } from "./email.server.js";
import { findBusinessProfile } from "./business.server.js";

const has = (name: string) => Boolean(process.env[name]?.trim());

/** Settings → Setup check: what this site has configured, with live tests where they're read-only. Never returns key values. */
export const runSetupCheck = createServerFn({ method: "POST" }).handler(async () => {
  const [ai, stripe] = await Promise.all([pingAI(), stripeCheck()]);
  return {
    pilot: pilotPremium(),
    ai,
    stripe,
    email: emailSetup(),
    square: has("SQUARE_APPLICATION_ID") && has("SQUARE_APPLICATION_SECRET"),
    quickbooks:
      (has("QUICKBOOKS_CLIENT_ID") || has("QB_CLIENT_ID") || has("QB_ClIENT_ID")) &&
      (has("QUICKBOOKS_CLIENT_SECRET") || has("QB_CLIENT_SECRET")),
  };
});

/** Owner-triggered test email to the business's own address. */
export const sendSetupTestEmail = createServerFn({ method: "POST" }).handler(async () => {
  const result = await sendTestEmail(await findBusinessProfile());
  return result.ok ? { ok: true as const, to: result.to } : { ok: false as const, message: result.message };
});
