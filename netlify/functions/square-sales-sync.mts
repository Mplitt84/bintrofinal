import { syncSquareSalesIfConnected } from "../../src/server/integrations.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";
import { forEachBusiness } from "../../src/server/tenant.ts";

/** Pulls completed Square sales into Bintro every 15 minutes so stock drops as items sell. */
export default async () => {
  try {
    const failures = await forEachBusiness(async (businessId) => {
      if (!(await hasFeature("square"))) return;
      const result = await syncSquareSalesIfConnected();
      if (result) console.log("Square sales synced", businessId, result);
    });
    for (const f of failures) console.error("Square sales sync failed for business", f.businessId, f.error);
  } catch (error) {
    console.error("Square sales sync failed", error);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
