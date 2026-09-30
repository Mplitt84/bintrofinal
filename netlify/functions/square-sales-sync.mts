import { syncSquareSalesIfConnected } from "../../src/server/integrations.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";

/** Pulls completed Square sales into Bintro every 15 minutes so stock drops as items sell. */
export default async () => {
  try {
    if (!(await hasFeature("square"))) return;
    const result = await syncSquareSalesIfConnected();
    if (result) console.log("Square sales synced", result);
  } catch (error) {
    console.error("Square sales sync failed", error);
  }
};

export const config = {
  schedule: "*/15 * * * *",
};
