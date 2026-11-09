import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { connectionRequests } from "../../db/schema.js";

/** Platforms this business has asked for (directory ids, plus names typed under "other"). */
export const getConnectionRequests = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await db.select().from(connectionRequests).orderBy(desc(connectionRequests.createdAt));
  return rows.map((r) => ({ platform: r.platform, name: r.name, at: r.createdAt.toISOString() }));
});

/** Records a request for a connection; the list is the demand behind partnership pitches. */
export const requestConnection = createServerFn({ method: "POST" })
  .inputValidator(z.object({ platform: z.string().min(1).max(40), name: z.string().max(80).optional(), staffName: z.string().max(60).optional() }))
  .handler(async ({ data }) => {
    await db.insert(connectionRequests).values({ platform: data.platform, name: (data.name ?? "").trim(), staffName: (data.staffName ?? "").trim() });
    return { ok: true };
  });
