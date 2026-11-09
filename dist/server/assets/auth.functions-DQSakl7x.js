import { c as createServerFn, b as getCookie, d as deleteCookie } from "../server.js";
import { z } from "zod";
import { e as authEnabled, o as ownerEmail, l as userForToken, S as SESSION_COOKIE, n as endSession, a as requireOwner, q as listUsers, t as addUser, v as removeUser } from "./auth.middleware-C_30RReI.js";
import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import "node:async_hooks";
import "node:stream";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "node:crypto";
import "drizzle-orm";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
const getAuthState_createServerFn_handler = createServerRpc({
  id: "7980b5a64330be14daeb23e8b1773d4ec1917ab5b561f72f7cbba8d03de3017f",
  name: "getAuthState",
  filename: "src/server/auth.functions.ts"
}, (opts) => getAuthState.__executeServer(opts));
const getAuthState = createServerFn({
  method: "GET"
}).handler(getAuthState_createServerFn_handler, async () => {
  const enabled = authEnabled();
  return {
    enabled,
    user: enabled ? await userForToken(getCookie(SESSION_COOKIE)) : null,
    ownerConfigured: Boolean(ownerEmail())
  };
});
const signOut_createServerFn_handler = createServerRpc({
  id: "b3f497d8a4691d5e1c3d850825e98e6af61a48877512ba288afadd236c6896bb",
  name: "signOut",
  filename: "src/server/auth.functions.ts"
}, (opts) => signOut.__executeServer(opts));
const signOut = createServerFn({
  method: "POST"
}).handler(signOut_createServerFn_handler, async () => {
  await endSession(getCookie(SESSION_COOKIE));
  deleteCookie(SESSION_COOKIE, {
    path: "/"
  });
  return {
    ok: true
  };
});
const getAccessList_createServerFn_handler = createServerRpc({
  id: "1d8a7d052bec8f6919886eeddc29f8b74fc573f2157c30e183394d7b2ff7d310",
  name: "getAccessList",
  filename: "src/server/auth.functions.ts"
}, (opts) => getAccessList.__executeServer(opts));
const getAccessList = createServerFn({
  method: "GET"
}).middleware([requireOwner]).handler(getAccessList_createServerFn_handler, async () => listUsers());
const addAccess_createServerFn_handler = createServerRpc({
  id: "9abda59e2c23118e4531199339967f8691a2bedfa4c902dfc686c41c56a83ff9",
  name: "addAccess",
  filename: "src/server/auth.functions.ts"
}, (opts) => addAccess.__executeServer(opts));
const addAccess = createServerFn({
  method: "POST"
}).middleware([requireOwner]).inputValidator(z.object({
  email: z.string().max(200),
  role: z.enum(["owner", "staff"])
})).handler(addAccess_createServerFn_handler, async ({
  data,
  context
}) => {
  try {
    await addUser(data.email, data.role, context?.user?.email ?? "");
    return {
      ok: true,
      users: await listUsers()
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn’t add that email."
    };
  }
});
const removeAccess_createServerFn_handler = createServerRpc({
  id: "d3345f638976804fdc783b19b49c2f86e1d5da43eaff075c5e697afcaa808ed1",
  name: "removeAccess",
  filename: "src/server/auth.functions.ts"
}, (opts) => removeAccess.__executeServer(opts));
const removeAccess = createServerFn({
  method: "POST"
}).middleware([requireOwner]).inputValidator(z.object({
  id: z.number().int()
})).handler(removeAccess_createServerFn_handler, async ({
  data,
  context
}) => {
  try {
    await removeUser(data.id, context?.user?.id ?? 0);
    return {
      ok: true,
      users: await listUsers()
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn’t remove that person."
    };
  }
});
export {
  addAccess_createServerFn_handler,
  getAccessList_createServerFn_handler,
  getAuthState_createServerFn_handler,
  removeAccess_createServerFn_handler,
  signOut_createServerFn_handler
};
