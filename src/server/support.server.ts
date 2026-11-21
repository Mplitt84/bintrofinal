/**
 * The help line between shops (pilot testers above all) and the Bintro site owner.
 *
 * A shop sends a question or "something's broken" from inside the app; the site owner gets a
 * push notification on every phone they turned alerts on for (and an email as a backup), and
 * answers from Settings → Pilot testers → Messages. The shop sees the reply in the same sheet.
 * Crashes on a tester's site raise an automatic "problem" message (once an hour per shop).
 *
 * `support_messages` is a site-wide table (SHARED_TABLES): every query here filters on
 * business_id by hand, and only the site owner reads across businesses.
 */
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { supportMessages } from "../../db/schema.js";
import { DEFAULT_BUSINESS_ID, businessId, runForBusiness } from "./tenant.js";
import { ownerEmail } from "./auth.server.js";
import { findBusinessProfile } from "./business.server.js";
import { displayBusinessName } from "../lib/business-types.js";
import { pushToStaff, saveSubscription } from "./push.server.js";
import { sendNote } from "./email.server.js";

/** The push "team member" name the site owner's alert devices are saved under, in business 1. */
export const OWNER_DEVICE = "__site_owner__";
export const AUTO_ERROR_EVERY_MS = 60 * 60_000;

export type SupportKind = "question" | "problem" | "auto-error" | "reply";
export type SupportMessage = {
  id: number;
  businessId: number;
  businessName: string;
  fromName: string;
  fromEmail: string;
  direction: "in" | "out";
  kind: SupportKind;
  body: string;
  page: string;
  createdAt: string;
  readAt: string | null;
};

const toMsg = (r: typeof supportMessages.$inferSelect): SupportMessage => ({
  id: r.id,
  businessId: r.businessId,
  businessName: r.businessName,
  fromName: r.fromName,
  fromEmail: r.fromEmail,
  direction: r.direction === "out" ? "out" : "in",
  kind: (["question", "problem", "auto-error", "reply"].includes(r.kind) ? r.kind : "question") as SupportKind,
  body: r.body,
  page: r.page,
  createdAt: r.createdAt.toISOString(),
  readAt: r.readAt?.toISOString() ?? null,
});

/** Push to the site owner's phones, with an email as the backup. Never throws. */
export async function alertOwner(title: string, body: string) {
  let pushed = 0;
  try {
    pushed = await runForBusiness(DEFAULT_BUSINESS_ID, () => pushToStaff(OWNER_DEVICE, { title, body, url: "/?settings=profile#settings", tag: "support" }));
  } catch (error) {
    console.error("Owner push failed", error);
  }
  const to = ownerEmail();
  if (to) {
    try {
      const profile = await runForBusiness(DEFAULT_BUSINESS_ID, () => findBusinessProfile());
      await sendNote(profile, to, title, `${body}\n\nAnswer in Bintro: Settings → Pilot testers → Messages.`);
    } catch (error) {
      console.error("Owner email failed", error);
    }
  }
  return pushed;
}

/** A shop sends a message (from inside its own scope). The site owner is alerted at once. */
export async function sendSupport(input: { kind: "question" | "problem"; body: string; page: string; device: string; fromName: string; fromEmail: string }) {
  const profile = await findBusinessProfile();
  const shop = displayBusinessName(profile);
  const body = input.body.trim().slice(0, 4000);
  if (!body) throw new Error("Type your message first.");
  const [row] = await db
    .insert(supportMessages)
    .values({
      businessId: businessId(),
      businessName: shop,
      fromName: input.fromName.slice(0, 80),
      fromEmail: input.fromEmail.slice(0, 200),
      direction: "in",
      kind: input.kind,
      body,
      page: input.page.slice(0, 60),
      device: input.device.slice(0, 200),
    })
    .returning();
  const who = input.fromName || input.fromEmail || "Someone";
  const pushed = await alertOwner(
    input.kind === "problem" ? `🚨 ${shop}: something's not working` : `💬 ${shop} has a question`,
    `${who}: ${body.slice(0, 180)}${input.page ? ` (on ${input.page})` : ""}`,
  );
  return { message: toMsg(row), pushed };
}

/** This shop's conversation, oldest first. Marks Bintro's replies read. */
export async function myThread() {
  const id = businessId();
  const rows = await db
    /* cross-business: shared help-line table, filtered to this shop */
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.businessId, id))
    .orderBy(asc(supportMessages.createdAt))
    .limit(200);
  await db
    .update(supportMessages)
    .set({ readAt: new Date() })
    .where(and(eq(supportMessages.businessId, id), eq(supportMessages.direction, "out"), isNull(supportMessages.readAt)));
  return rows.map(toMsg);
}

/** Replies from Bintro this shop hasn't seen. */
export async function myUnread() {
  const rows = await db
    /* cross-business: shared help-line table, filtered to this shop */
    .select({ id: supportMessages.id })
    .from(supportMessages)
    .where(and(eq(supportMessages.businessId, businessId()), eq(supportMessages.direction, "out"), isNull(supportMessages.readAt)));
  return rows.length;
}

/** Site owner: every shop's latest messages, newest first. */
export async function ownerInbox() {
  const rows = await db
    /* cross-business: the site owner's help-line inbox */
    .select()
    .from(supportMessages)
    .orderBy(desc(supportMessages.createdAt))
    .limit(500);
  return rows.map(toMsg);
}

/** Site owner: messages from shops not read yet. */
export async function ownerUnread() {
  const rows = await db
    /* cross-business: the site owner's help-line inbox */
    .select({ id: supportMessages.id, businessName: supportMessages.businessName, body: supportMessages.body, kind: supportMessages.kind })
    .from(supportMessages)
    .where(and(eq(supportMessages.direction, "in"), isNull(supportMessages.readAt)))
    .orderBy(desc(supportMessages.createdAt));
  return rows;
}

/** Site owner: answer a shop (and mark its messages read). */
export async function ownerReply(toBusiness: number, body: string, fromName: string) {
  const text = body.trim().slice(0, 4000);
  if (!text) throw new Error("Type your reply first.");
  const [last] = await db
    /* cross-business: the site owner's help-line inbox */
    .select({ businessName: supportMessages.businessName })
    .from(supportMessages)
    .where(eq(supportMessages.businessId, toBusiness))
    .orderBy(desc(supportMessages.createdAt))
    .limit(1);
  if (!last) throw new Error("That shop hasn't written yet.");
  await markThreadRead(toBusiness);
  const [row] = await db
    .insert(supportMessages)
    .values({ businessId: toBusiness, businessName: last.businessName, fromName, direction: "out", kind: "reply", body: text })
    .returning();
  return toMsg(row);
}

export async function markThreadRead(toBusiness: number) {
  await db
    /* cross-business: the site owner's help-line inbox */
    .update(supportMessages)
    .set({ readAt: new Date() })
    .where(and(eq(supportMessages.businessId, toBusiness), eq(supportMessages.direction, "in"), isNull(supportMessages.readAt)));
}

/** Site owner: this phone gets the alerts. */
export async function saveOwnerDevice(sub: { endpoint: string; p256dh: string; auth: string }, userAgent: string) {
  await runForBusiness(DEFAULT_BUSINESS_ID, () => saveSubscription(OWNER_DEVICE, sub, userAgent));
  return runForBusiness(DEFAULT_BUSINESS_ID, () =>
    pushToStaff(OWNER_DEVICE, { title: "Bintro alerts are on", body: "You'll hear here the moment a pilot shop has a question or hits a problem.", tag: "support-test" }),
  );
}

/**
 * A crash in a shop that isn't the site owner's: raise a "problem" message on its own, at most
 * once an hour per shop, so an outage reaches the owner before anyone has to write in.
 */
export async function autoReportProblem(input: { message: string; where: string; staffName: string; device: string }) {
  const id = businessId();
  if (id === DEFAULT_BUSINESS_ID) return false;
  const [recent] = await db
    /* cross-business: shared help-line table, filtered to this shop */
    .select({ id: supportMessages.id })
    .from(supportMessages)
    .where(and(eq(supportMessages.businessId, id), eq(supportMessages.kind, "auto-error"), gte(supportMessages.createdAt, new Date(Date.now() - AUTO_ERROR_EVERY_MS))))
    .limit(1);
  if (recent) return false;
  const shop = displayBusinessName(await findBusinessProfile());
  await db.insert(supportMessages).values({
    businessId: id,
    businessName: shop,
    fromName: input.staffName.slice(0, 80),
    direction: "in",
    kind: "auto-error",
    body: `The app hit an error: ${input.message.slice(0, 300)}`,
    page: input.where.slice(0, 60),
    device: input.device.slice(0, 200),
  });
  await alertOwner(`⚠️ ${shop} hit an error`, `${input.message.slice(0, 160)}${input.where ? ` (on ${input.where})` : ""}`);
  return true;
}
