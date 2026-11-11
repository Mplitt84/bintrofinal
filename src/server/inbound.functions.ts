import { createServerFn } from "@tanstack/react-start";
import { requireOwner, requireUser } from "./auth.middleware";
import { ensureInboundToken, inboundSetup } from "./inbound.server.js";

/** Settings → Connections: the business's private "email orders to Bintro" address and the last emails received. */
export const getInboundSetup = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => inboundSetup());

/** Makes a new address (the old one stops working), e.g. if it was shared by mistake. */
export const resetInboundAddress = createServerFn({ method: "POST" })
  .middleware([requireOwner])
  .handler(async () => {
    await ensureInboundToken(true);
    return inboundSetup();
  });
