import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";
import { assertTenantScoped } from "./tenancy-guard.js";

/**
 * Every statement passes the tenancy guard before it runs: a query on a business's
 * data that doesn't name business_id is refused rather than returning another
 * business's rows. Drizzle calls the logger with the SQL it is about to send, so
 * throwing here stops the query.
 */
export const db = drizzle({
  schema,
  logger: {
    logQuery(query: string) {
      assertTenantScoped(query);
    },
  },
});
