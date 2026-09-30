import { runInsightReport } from "../../src/server/insights.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";

/** Monday-morning email of what sold very well last week (plus anything selling out fast). */
export default async () => {
  try {
    // Sales reports come with Plus and Premium.
    if (!(await hasFeature("insights"))) return;
    const run = await runInsightReport("weekly");
    console.log("Weekly insights", run.periodKey, run.email ?? "no email");
  } catch (error) {
    console.error("Weekly insights failed", error);
  }
};

export const config = {
  schedule: "0 13 * * 1",
};
