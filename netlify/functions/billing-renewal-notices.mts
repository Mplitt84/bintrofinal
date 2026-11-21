import { forEachBusiness } from "../../src/server/tenant.ts";
import { sendRenewalNotice } from "../../src/server/account.server.ts";

/**
 * Daily renewal notices: yearly plans get an email 15–30 days before they renew, monthly plans a
 * yearly reminder, each with the price, how often, and how to cancel (California's auto-renewal rules).
 */
export default async () => {
  const appUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "";
  try {
    const failures = await forEachBusiness(async (businessId) => {
      const sent = await sendRenewalNotice(appUrl);
      if (sent) console.log("Renewal notice", businessId, sent);
    });
    for (const f of failures) console.error("Renewal notice failed for business", f.businessId, f.error);
  } catch (error) {
    console.error("Renewal notices failed", error);
  }
};

export const config = {
  // 15:00 UTC = 9 am Central.
  schedule: "0 15 * * *",
};
