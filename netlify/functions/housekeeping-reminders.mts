import { runHousekeepingReminders } from "../../src/server/reminders.server.ts";
import { forEachBusiness } from "../../src/server/tenant.ts";

/** Every 10 minutes: arriving and close-out housekeeping reminders to staff phones. */
export default async () => {
  try {
    const failures = await forEachBusiness(async (businessId) => {
      const result = await runHousekeepingReminders();
      if (result.sent) console.log("Housekeeping reminders sent", businessId, result);
    });
    for (const f of failures) console.error("Housekeeping reminders failed for business", f.businessId, f.error);
  } catch (error) {
    console.error("Housekeeping reminders failed", error);
  }
};

export const config = {
  schedule: "*/10 * * * *",
};
