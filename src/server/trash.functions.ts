import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireOwner, requireUser } from "./auth.middleware";
import { recentlyDeleted, undo } from "./trash.server.js";

/** Undo from a toast, or Restore from Recently deleted. */
export const undoChange = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => undo(data.id));

export const getRecentlyDeleted = createServerFn({ method: "GET" })
  .middleware([requireOwner])
  .handler(async () => recentlyDeleted());
