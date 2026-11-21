import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSiteOwner, requireUser } from "./auth.middleware";
import { vapidKeys } from "./push.server.js";
import { markThreadRead, myThread, myUnread, ownerInbox, ownerReply, ownerUnread, saveOwnerDevice, sendSupport } from "./support.server.js";

/** A shop writes to Bintro (question or "something's broken"). */
export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator(
    z.object({ kind: z.enum(["question", "problem"]), body: z.string().trim().min(1).max(4000), page: z.string().max(60), device: z.string().max(200), fromName: z.string().max(80) }),
  )
  .handler(async ({ data, context }) => {
    try {
      const r = await sendSupport({ ...data, fromName: data.fromName || context.user?.teamName || context.user?.name || "", fromEmail: context.user?.email ?? "" });
      return { ok: true as const, message: r.message, thread: await myThread() };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t send that." };
    }
  });

export const getMySupportThread = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ thread: await myThread() }));

export const getMySupportUnread = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async () => ({ unread: await myUnread() }));

/** Site owner: the inbox across every shop. */
export const getSupportInbox = createServerFn({ method: "GET" })
  .middleware([requireSiteOwner])
  .handler(async () => ({ messages: await ownerInbox() }));

export const getSupportUnread = createServerFn({ method: "GET" })
  .middleware([requireSiteOwner])
  .handler(async () => ({ unread: await ownerUnread() }));

export const replySupport = createServerFn({ method: "POST" })
  .middleware([requireSiteOwner])
  .inputValidator(z.object({ businessId: z.number().int().positive(), body: z.string().trim().min(1).max(4000) }))
  .handler(async ({ data, context }) => {
    try {
      await ownerReply(data.businessId, data.body, context.user?.teamName || context.user?.name || "Bintro");
      return { ok: true as const, messages: await ownerInbox() };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Couldn’t send that reply." };
    }
  });

export const markSupportRead = createServerFn({ method: "POST" })
  .middleware([requireSiteOwner])
  .inputValidator(z.object({ businessId: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await markThreadRead(data.businessId);
    return { ok: true as const };
  });

/** Site owner: the key a phone needs to accept alerts. */
export const getAlertKey = createServerFn({ method: "GET" })
  .middleware([requireSiteOwner])
  .handler(async () => ({ publicKey: (await vapidKeys()).publicKey }));

export const subscribeAlerts = createServerFn({ method: "POST" })
  .middleware([requireSiteOwner])
  .inputValidator(z.object({ endpoint: z.string().url().max(1000), p256dh: z.string().max(200), auth: z.string().max(100), userAgent: z.string().max(300) }))
  .handler(async ({ data }) => ({ ok: true as const, sent: await saveOwnerDevice(data, data.userAgent) }));
