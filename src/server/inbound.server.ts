/**
 * "Email orders to Bintro": vendor order confirmations forwarded to the business's private
 * address arrive through Resend Receiving (webhook `email.received`), are read by AI and saved
 * as open orders under Restock → Deliveries.
 *
 * Env: RESEND_API_KEY (fetches the email body), RESEND_WEBHOOK_SECRET (verifies the webhook),
 * BINTRO_INBOUND_DOMAIN (the Resend receiving domain, e.g. abc123.resend.app or in.bintroapp.com).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { businessId, mine, owned, runForBusiness } from "./tenant.js";
import { businessProfile, inboundEmails } from "../../db/schema.js";
import { EMPTY_PROFILE } from "../lib/business-types.js";
import { extractOrderEmail } from "./product-lookup.server.js";
import { matchOrderLines } from "./import.server.js";
import { saveEmailedOrder } from "./orders.server.js";
import { findBusinessContext } from "./business.server.js";

const LOCAL_PREFIX = "orders-";

export function inboundDomain() {
  return (process.env.BINTRO_INBOUND_DOMAIN ?? "").trim().toLowerCase().replace(/^@/, "");
}

export async function ensureInboundToken(reset = false) {
  const rows = await db.select({ token: businessProfile.inboundToken }).from(businessProfile).where(mine(businessProfile));
  const current = rows[0]?.token ?? "";
  if (current && !reset) return current;
  const token = randomBytes(9).toString("hex");
  await db
    .insert(businessProfile)
    .values({ ...EMPTY_PROFILE, ...owned(), id: businessId(), inboundToken: token })
    .onConflictDoUpdate({ target: businessProfile.id, set: { inboundToken: token } });
  return token;
}

/** What Settings shows: the address (once the domain is set), what's missing, and the last emails. */
export async function inboundSetup() {
  const domain = inboundDomain();
  const token = await ensureInboundToken();
  const recent = await db.select().from(inboundEmails).where(mine(inboundEmails)).orderBy(desc(inboundEmails.createdAt)).limit(8);
  return {
    address: domain ? `${LOCAL_PREFIX}${token}@${domain}` : "",
    missing: [
      !domain && "BINTRO_INBOUND_DOMAIN",
      !process.env.RESEND_WEBHOOK_SECRET?.trim() && "RESEND_WEBHOOK_SECRET",
      !process.env.RESEND_API_KEY?.trim() && "RESEND_API_KEY",
    ].filter(Boolean) as string[],
    recent: recent.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      from: r.fromAddress,
      subject: r.subject,
      vendor: r.vendor,
      status: r.status as "order" | "skipped" | "error",
      message: r.message,
      orderId: r.orderId,
    })),
  };
}

/** Svix signature check used by Resend webhooks: HMAC-SHA256 of "id.timestamp.body" with the base64 secret. */
export function verifyResendSignature(body: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id") ?? "";
  const timestamp = headers.get("svix-timestamp") ?? "";
  const signatures = headers.get("svix-signature") ?? "";
  if (!id || !timestamp || !signatures || !secret) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " \t ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#36;|&dollar;/g, "$")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

type ReceivedEmail = { from: string; to: string[]; subject: string; text: string | null; html: string | null };

async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim() ?? ""}` },
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status} for the email`);
  return (await res.json()) as ReceivedEmail;
}

async function record(row: typeof inboundEmails.$inferInsert) {
  await db
    .insert(inboundEmails)
    .values({ ...row, ...owned() })
    .onConflictDoUpdate({ target: inboundEmails.emailId, set: { status: row.status, message: row.message, vendor: row.vendor, orderId: row.orderId } });
}

/**
 * Handles one verified `email.received` event. Emails not addressed to this business's
 * secret address are ignored (several sites can share one Resend receiving domain).
 */
export async function handleInboundEvent(event: {
  type?: string;
  data?: { email_id?: string; from?: string; to?: string[]; received_for?: string[]; subject?: string };
}): Promise<string> {
  if (event.type !== "email.received" || !event.data?.email_id) return "ignored";
  const domain = inboundDomain();
  if (!domain) return "not for this site";
  const recipients = [...(event.data.to ?? []), ...(event.data.received_for ?? [])].map((a) =>
    (a.match(/<([^>]+)>/)?.[1] ?? a).trim().toLowerCase(),
  );
  // The secret token in the address says which business the vendor email is for.
  const business = await businessForInboundAddress(recipients, domain);
  if (!business) return "not for this site";
  return runForBusiness(business, () => readOrderEmail(event));
}

/**
 * Which business owns one of these recipient addresses. The webhook arrives with no
 * session, and several businesses share one receiving domain, so this deliberately
 * looks across every business for the secret token in the address.
 */
async function businessForInboundAddress(recipients: string[], domain: string) {
  const tokens = recipients
    .filter((a) => a.endsWith(`@${domain}`) && a.startsWith(LOCAL_PREFIX))
    .map((a) => a.slice(LOCAL_PREFIX.length, a.indexOf("@")))
    .filter(Boolean);
  if (!tokens.length) return null;
  const rows = await db
    .select({ businessId: businessProfile.businessId, token: businessProfile.inboundToken })
    .from(businessProfile)
    .where(and(sql`/* cross-business: inbound email address */ true`, inArray(businessProfile.inboundToken, tokens)));
  return rows[0]?.businessId ?? null;
}

/** Reads one vendor order email, already scoped to the business it was sent to. */
async function readOrderEmail(event: {
  data?: { email_id?: string; from?: string; subject?: string };
}): Promise<string> {
  if (!event.data?.email_id) return "ignored";

  const emailId = event.data.email_id;
  const already = await db.select({ id: inboundEmails.id, status: inboundEmails.status }).from(inboundEmails).where(and(mine(inboundEmails), eq(inboundEmails.emailId, emailId)));
  if (already[0]?.status === "order") return "duplicate";

  const base = { emailId, fromAddress: (event.data.from ?? "").slice(0, 200), subject: (event.data.subject ?? "").slice(0, 300) };
  try {
    const email = await fetchReceivedEmail(emailId);
    const text = (email.text?.trim() || htmlToText(email.html ?? "")).slice(0, 40_000);
    if (!text) {
      await record({ ...base, status: "skipped", message: "The email was empty." });
      return "empty";
    }
    const business = await findBusinessContext();
    const read = await extractOrderEmail({ subject: email.subject ?? base.subject, from: email.from ?? base.fromAddress, text }, business);
    if (!read.ok) {
      await record({ ...base, status: "skipped", message: read.message });
      return "no products";
    }
    const vendor = read.vendor || (email.from ?? "").split("@")[1]?.split(".")[0] || "Emailed order";
    const lines = await matchOrderLines(read.lines.map((l) => ({ ...l, vendor })));
    const orderId = await saveEmailedOrder({
      vendor,
      note: `Emailed in: ${base.subject}${read.date ? ` · ${read.date}` : ""}`,
      lines,
    });
    if (!orderId) {
      await record({ ...base, vendor, status: "skipped", message: "No ordered products found in that email." });
      return "no products";
    }
    const count = lines.filter((l) => (l.qty ?? 0) > 0).length;
    await record({ ...base, vendor, status: "order", orderId, message: `${count} product${count === 1 ? "" : "s"} saved as an open order.` });
    return "order saved";
  } catch (error) {
    console.error("Inbound order email failed", error);
    await record({ ...base, status: "error", message: error instanceof Error ? error.message.slice(0, 300) : "Something went wrong reading it." });
    throw error;
  }
}
