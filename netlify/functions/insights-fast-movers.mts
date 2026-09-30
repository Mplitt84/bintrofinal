import { runInsightReport } from "../../src/server/insights.server.ts";
import { hasFeature } from "../../src/server/account.server.ts";

/** Every 3 hours: emails newly flagged items that are selling out fast, with a bulk order and cost prediction. */
export default async () => {
  try {
    // Sales reports come with Plus and Premium.
    if (!(await hasFeature("insights"))) return;
    const run = await runInsightReport("fast");
    if (run.email) console.log("Fast-mover alert", run.periodKey, run.email);
  } catch (error) {
    console.error("Fast-mover alert failed", error);
  }
};

export const config = {
  schedule: "15 */3 * * *",
};
