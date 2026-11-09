import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { d as db, e as connectionRequests } from "./index-nBnBfwCa.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
const getConnectionRequests_createServerFn_handler = createServerRpc({
  id: "194c5168bd712f8f142a6f6ad5cd46cacabf49dfc5921685e597138fadc45421",
  name: "getConnectionRequests",
  filename: "src/server/connections.functions.ts"
}, (opts) => getConnectionRequests.__executeServer(opts));
const getConnectionRequests = createServerFn({
  method: "GET"
}).handler(getConnectionRequests_createServerFn_handler, async () => {
  const rows = await db.select().from(connectionRequests).orderBy(desc(connectionRequests.createdAt));
  return rows.map((r) => ({
    platform: r.platform,
    name: r.name,
    at: r.createdAt.toISOString()
  }));
});
const requestConnection_createServerFn_handler = createServerRpc({
  id: "b7e30bce2fc5d1eebff98f88a86621160f723f372d28f56a55320b6f5e113e6b",
  name: "requestConnection",
  filename: "src/server/connections.functions.ts"
}, (opts) => requestConnection.__executeServer(opts));
const requestConnection = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  platform: z.string().min(1).max(40),
  name: z.string().max(80).optional(),
  staffName: z.string().max(60).optional()
})).handler(requestConnection_createServerFn_handler, async ({
  data
}) => {
  await db.insert(connectionRequests).values({
    platform: data.platform,
    name: (data.name ?? "").trim(),
    staffName: (data.staffName ?? "").trim()
  });
  return {
    ok: true
  };
});
export {
  getConnectionRequests_createServerFn_handler,
  requestConnection_createServerFn_handler
};
