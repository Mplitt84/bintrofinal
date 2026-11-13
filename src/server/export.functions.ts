import { createServerFn } from "@tanstack/react-start";
import { requireOwner } from "./auth.middleware";
import { buildExport } from "./export.server.js";

/**
 * Everything this business has in Bintro, as spreadsheets. Owner-only: it is the
 * whole business in one download.
 */
export const exportEverything = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => buildExport());
