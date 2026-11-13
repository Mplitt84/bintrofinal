import { runInsightReport } from "../../src/server/insights.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";
import { forEachBusiness } from "../../src/server/tenant.ts";

/** First-of-the-month email of slow movers (color, retail…) and prices that need updating. */
export default async () => {
  try {
    // Sales reports come with Plus and Premium.
    const failures = await forEachBusiness(async (businessId) => {
      if (!(await hasFeature("insights"))) return;
      const run = await runInsightReport("monthly");
      console.log("Monthly insights", businessId, run.periodKey, run.email ?? "no email");
    });
    for (const f of failures) console.error("Monthly insights failed for business", f.businessId, f.error);
  } catch (error) {
    console.error("Monthly insights failed", error);
  }
};

export const config = {
  schedule: "0 13 1 * *",
};
