import { runPriceScan } from "../../src/server/better-prices.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";
import { forEachBusiness } from "../../src/server/tenant.ts";

/** Wednesday morning: look for cheaper sellers of each shop's biggest-spend products (Plus). */
export default async () => {
  try {
    const failures = await forEachBusiness(async (businessId) => {
      if (!(await hasFeature("ai"))) return;
      const run = await runPriceScan();
      console.log("Better prices", businessId, JSON.stringify(run));
    });
    for (const f of failures) console.error("Better prices failed for business", f.businessId, f.error);
  } catch (error) {
    console.error("Better prices failed", error);
  }
};

export const config = {
  schedule: "0 14 * * 3",
};
