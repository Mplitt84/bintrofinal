import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "./auth.middleware";
import { needsWelcome } from "./signup.server.js";
import { businessId } from "./tenant.js";

/** Does this business still need the welcome screen? Decided on the server. */
export const getWelcomeState = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ needed: await needsWelcome(businessId()) }));
