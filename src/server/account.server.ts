import { createHmac, timingSafeEqual } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { account, billingEvents, products, teamMembers } from "../../db/schema.js";
import {
  FEATURE_INFO,
  TRIAL_DAYS,
  isPlanId,
  planById,
  planFor,
  planHas,
  planRank,
  priceFor,
  type AccountStatus,
  type AccountSummary,
  type BillingEvent,
  type BillingInterval,
  type Feature,
  type PlanId,
  centsLabel,
} from "../lib/plans.js";

const ACCOUNT_ID = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

type AccountRow = typeof account.$inferSelect;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

/** Stripe is on once the secret key is set. Until then plan changes apply right away with no charge. */
export function billingLive() {
  return Boolean(env("STRIPE_SECRET_KEY"));
}

function addInterval(from: Date, interval: BillingInterval, times = 1) {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + times);
  else d.setMonth(d.getMonth() + times);
  return d;
}

async function logEvent(kind: string, detail: string, amountCents = 0) {
  await db.insert(billingEvents).values({ kind, detail, amountCents });
}

async function saveAccount(values: Partial<AccountRow>) {
  const [row] = await db
    .update(account)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(account.id, ACCOUNT_ID))
    .returning();
  return row;
}

/** The account row, created on first use with a Premium trial so every feature can be tried. */
async function loadAccount(): Promise<AccountRow> {
  const rows = await db.select().from(account).where(eq(account.id, ACCOUNT_ID));
  if (rows[0]) return settle(rows[0]);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS);
  await db
    .insert(account)
    .values({ id: ACCOUNT_ID, plan: "premium", status: "trialing", trialEndsAt, currentPeriodEnd: trialEndsAt })
    .onConflictDoNothing();
  await logEvent("trial", `Started a ${TRIAL_DAYS}-day Premium trial`);
  const [row] = await db.select().from(account).where(eq(account.id, ACCOUNT_ID));
  return row;
}

/**
 * Applies anything whose date has passed: trials ending, pauses ending,
 * scheduled cancellations and (in pilot mode) renewals.
 */
async function settle(row: AccountRow): Promise<AccountRow> {
  const now = new Date();
  if (row.status === "trialing" && row.trialEndsAt && row.trialEndsAt <= now && !row.stripeSubscriptionId) {
    await logEvent("downgrade", "Premium trial ended. Moved to Free");
    return saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });
  }
  if (row.status === "paused" && row.pausedUntil && row.pausedUntil <= now) {
    await logEvent("resume", `${planById(row.plan).name} resumed after the pause`);
    return saveAccount({
      status: "active",
      pausedUntil: null,
      currentPeriodEnd: billingLive() ? row.currentPeriodEnd : addInterval(now, row.interval as BillingInterval),
    });
  }
  if (row.cancelAtPeriodEnd && row.currentPeriodEnd && row.currentPeriodEnd <= now) {
    await logEvent("cancel", `${planById(row.plan).name} ended. Moved to Free`);
    return saveAccount({
      plan: "free",
      status: "canceled",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      trialEndsAt: null,
      stripeSubscriptionId: "",
    });
  }
  if (!billingLive() && row.status === "active" && row.plan !== "free" && row.currentPeriodEnd && row.currentPeriodEnd <= now) {
    let next = row.currentPeriodEnd;
    while (next <= now) next = addInterval(next, row.interval as BillingInterval);
    return saveAccount({ currentPeriodEnd: next });
  }
  return row;
}

function effectivePlanOf(row: AccountRow): PlanId {
  if (row.status === "paused") return "free";
  return isPlanId(row.plan) ? row.plan : "free";
}

function summarize(row: AccountRow, usage: AccountSummary["usage"]): AccountSummary {
  return {
    plan: isPlanId(row.plan) ? row.plan : "free",
    effectivePlan: effectivePlanOf(row),
    interval: row.interval === "year" ? "year" : "month",
    status: row.status as AccountStatus,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    pausedUntil: row.pausedUntil?.toISOString() ?? null,
    ownerName: row.ownerName,
    billingEmail: row.billingEmail,
    paymentMethod: row.cardLast4
      ? { brand: row.cardBrand, last4: row.cardLast4, expMonth: row.cardExpMonth, expYear: row.cardExpYear }
      : null,
    billingLive: billingLive(),
    memberSince: row.createdAt.toISOString(),
    usage,
  };
}

async function countUsage() {
  const [[p], [t]] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(teamMembers),
  ]);
  return { products: Number(p?.n ?? 0), team: Number(t?.n ?? 0) };
}

export async function getAccountSummary(): Promise<AccountSummary> {
  const [row, usage] = await Promise.all([loadAccount(), countUsage()]);
  return summarize(row, usage);
}

export async function currentPlan(): Promise<PlanId> {
  return effectivePlanOf(await loadAccount());
}

export class PlanLimitError extends Error {}

/** Throws a friendly message when the business's plan doesn't include a feature. */
export async function assertFeature(feature: Feature) {
  const plan = await currentPlan();
  if (!planHas(plan, feature)) {
    throw new PlanLimitError(
      `${FEATURE_INFO[feature].label} is part of Bintro ${planFor(feature).name}. Upgrade in Settings → Account & billing.`,
    );
  }
}

export async function hasFeature(feature: Feature) {
  return planHas(await currentPlan(), feature);
}

export async function assertProductRoom(adding = 1) {
  const limit = planById(await currentPlan()).productLimit;
  if (limit === null) return;
  const { products: used } = await countUsage();
  if (used + adding > limit) {
    throw new PlanLimitError(`The Free plan holds up to ${limit} products. Upgrade to Plus for unlimited products.`);
  }
}

export async function assertTeamRoom() {
  const plan = planById(await currentPlan());
  if (plan.teamLimit === null) return;
  const { team } = await countUsage();
  if (team + 1 > plan.teamLimit) {
    throw new PlanLimitError(
      `The ${plan.name} plan includes up to ${plan.teamLimit} team members. Upgrade to add more.`,
    );
  }
}

export async function updateAccountDetails(data: { ownerName?: string; billingEmail?: string }) {
  await loadAccount();
  await saveAccount(data);
  if (billingLive() && data.billingEmail) {
    const row = await loadAccount();
    if (row.stripeCustomerId) await stripe(`/v1/customers/${row.stripeCustomerId}`, { email: data.billingEmail });
  }
  return getAccountSummary();
}

// --- Plan changes -----------------------------------------------------------

export type BillingResult = { account: AccountSummary; redirect?: string; message: string };

export async function changePlan(target: PlanId, interval: BillingInterval, origin: string): Promise<BillingResult> {
  const row = await loadAccount();
  const plan = planById(target);
  const from = planById(row.plan);
  const upgrade = planRank(target) > planRank(from.id);

  // Moving to Free is a cancellation of the paid plan.
  if (target === "free") {
    if (row.status === "trialing" || row.plan === "free" || !row.currentPeriodEnd) {
      await saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, pausedUntil: null });
      await logEvent("downgrade", "Moved to Free");
      return { account: await getAccountSummary(), message: "You're on the Free plan" };
    }
    return cancelPlan("Moved to Free");
  }

  if (billingLive()) return changeStripePlan(row, target, interval, origin);

  const now = new Date();
  await saveAccount({
    plan: target,
    interval,
    status: "active",
    trialEndsAt: null,
    pausedUntil: null,
    cancelAtPeriodEnd: false,
    cancelReason: "",
    currentPeriodEnd: addInterval(now, interval),
  });
  const verb = row.status === "trialing" ? "Chose" : upgrade ? "Upgraded to" : target === row.plan ? "Switched billing on" : "Changed to";
  await logEvent(
    upgrade ? "upgrade" : "downgrade",
    `${verb} ${plan.name} (${centsLabel(priceFor(plan, interval))}/${interval}). No charge in pilot mode`,
  );
  return { account: await getAccountSummary(), message: `You're on ${plan.name}` };
}

export async function pauseBilling(months: number): Promise<BillingResult> {
  const row = await loadAccount();
  if (row.plan === "free" || row.status === "trialing") {
    throw new PlanLimitError("Only paid plans can be paused.");
  }
  const until = addInterval(new Date(), "month", months);
  if (billingLive() && row.stripeSubscriptionId) {
    await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, {
      "pause_collection[behavior]": "void",
      "pause_collection[resumes_at]": String(Math.floor(until.getTime() / 1000)),
    });
  }
  await saveAccount({ status: "paused", pausedUntil: until, cancelAtPeriodEnd: false });
  await logEvent("pause", `Paused ${planById(row.plan).name} for ${months} month${months === 1 ? "" : "s"}`);
  return {
    account: await getAccountSummary(),
    message: `Billing paused until ${until.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  };
}

export async function resumeBilling(): Promise<BillingResult> {
  const row = await loadAccount();
  if (billingLive() && row.stripeSubscriptionId) {
    await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, { pause_collection: "", cancel_at_period_end: "false" });
    await syncSubscription(row.stripeSubscriptionId);
  }
  const wasPaused = row.status === "paused";
  await saveAccount({
    status: row.status === "trialing" ? "trialing" : "active",
    pausedUntil: null,
    cancelAtPeriodEnd: false,
    cancelReason: "",
    currentPeriodEnd:
      !billingLive() && wasPaused ? addInterval(new Date(), row.interval as BillingInterval) : undefined,
  });
  await logEvent(wasPaused ? "resume" : "reactivate", `${wasPaused ? "Resumed" : "Kept"} ${planById(row.plan).name}`);
  return { account: await getAccountSummary(), message: `${planById(row.plan).name} is back on` };
}

export async function cancelPlan(reason: string): Promise<BillingResult> {
  const row = await loadAccount();
  const name = planById(row.plan).name;
  if (row.plan === "free") throw new PlanLimitError("You're already on the Free plan.");

  // Trials simply end; there is nothing to bill.
  if (row.status === "trialing" && !row.stripeSubscriptionId) {
    await saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelReason: reason });
    await logEvent("cancel", `Ended the ${name} trial${reason ? ` (${reason})` : ""}`);
    return { account: await getAccountSummary(), message: "Trial ended. You're on the Free plan" };
  }

  if (billingLive() && row.stripeSubscriptionId) {
    await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, {
      cancel_at_period_end: "true",
      pause_collection: "",
      "cancellation_details[comment]": reason.slice(0, 500),
    });
  }
  const end = row.currentPeriodEnd ?? new Date();
  await saveAccount({
    status: row.status === "paused" ? "active" : row.status,
    pausedUntil: null,
    cancelAtPeriodEnd: true,
    cancelReason: reason,
    currentPeriodEnd: end,
  });
  await logEvent("cancel", `Canceled ${name}${reason ? ` (${reason})` : ""}. Access until the period ends`);
  return {
    account: await getAccountSummary(),
    message: `${name} canceled. It stays on until ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  };
}

export async function listBillingHistory(): Promise<BillingEvent[]> {
  const rows = await db.select().from(billingEvents).orderBy(desc(billingEvents.createdAt)).limit(30);
  const events: BillingEvent[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    detail: r.detail,
    amountCents: r.amountCents,
    createdAt: r.createdAt.toISOString(),
  }));
  if (billingLive()) {
    const row = await loadAccount();
    if (row.stripeCustomerId) {
      try {
        const invoices = await stripe<{ data: StripeInvoice[] }>(
          `/v1/invoices?customer=${encodeURIComponent(row.stripeCustomerId)}&limit=12`,
          undefined,
          "GET",
        );
        invoices.data
          .filter((i) => i.status === "paid" || i.status === "open")
          .forEach((i, n) =>
            events.push({
              id: -1 - n,
              kind: "charge",
              detail: `Invoice ${i.number ?? ""}${i.status === "open" ? " (unpaid)" : ""}`.trim(),
              amountCents: i.status === "paid" ? i.amount_paid : i.amount_due,
              createdAt: new Date(i.created * 1000).toISOString(),
              url: i.hosted_invoice_url ?? undefined,
            }),
          );
      } catch (error) {
        console.error("Couldn't load Stripe invoices", error);
      }
    }
  }
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Stripe -------------------------------------------------------------------

type StripeInvoice = {
  number: string | null;
  status: string;
  amount_paid: number;
  amount_due: number;
  created: number;
  hosted_invoice_url: string | null;
};

type StripeCard = { brand: string; last4: string; exp_month: number; exp_year: number };

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  trial_end: number | null;
  pause_collection: { resumes_at: number | null } | null;
  default_payment_method: { card?: StripeCard } | string | null;
  items: { data: { id: string; current_period_end?: number; price: { id: string; recurring?: { interval: string } } }[] };
};

async function stripe<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" && params ? new URLSearchParams(params).toString() : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe request failed (${res.status})`);
  return json;
}

const PRICE_ENV: Record<Exclude<PlanId, "free">, Record<BillingInterval, string>> = {
  plus: { month: "STRIPE_PRICE_PLUS_MONTHLY", year: "STRIPE_PRICE_PLUS_YEARLY" },
  premium: { month: "STRIPE_PRICE_PREMIUM_MONTHLY", year: "STRIPE_PRICE_PREMIUM_YEARLY" },
};

function stripePrice(plan: Exclude<PlanId, "free">, interval: BillingInterval) {
  const id = env(PRICE_ENV[plan][interval]);
  if (!id) throw new Error(`Add ${PRICE_ENV[plan][interval]} in Netlify to sell ${planById(plan).name} ${interval}ly.`);
  return id;
}

function planFromPrice(priceId: string): { plan: PlanId; interval: BillingInterval } | null {
  for (const plan of ["plus", "premium"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (env(PRICE_ENV[plan][interval]) === priceId) return { plan, interval };
    }
  }
  return null;
}

async function changeStripePlan(
  row: AccountRow,
  target: Exclude<PlanId, "free">,
  interval: BillingInterval,
  origin: string,
): Promise<BillingResult> {
  const price = stripePrice(target, interval);
  const name = planById(target).name;

  if (row.stripeSubscriptionId) {
    const sub = await stripe<StripeSubscription>(`/v1/subscriptions/${row.stripeSubscriptionId}`, undefined, "GET");
    await stripe(`/v1/subscriptions/${sub.id}`, {
      "items[0][id]": sub.items.data[0].id,
      "items[0][price]": price,
      proration_behavior: "create_prorations",
      cancel_at_period_end: "false",
      pause_collection: "",
    });
    await syncSubscription(sub.id);
    await logEvent(planRank(target) > planRank(row.plan as PlanId) ? "upgrade" : "downgrade", `Changed to ${name} (${interval}ly)`);
    return { account: await getAccountSummary(), message: `You're on ${name}` };
  }

  // No subscription yet: send the owner to Stripe Checkout to add a card.
  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?settings=account&billing=canceled`,
    allow_promotion_codes: "true",
    "metadata[plan]": target,
  };
  if (row.stripeCustomerId) params.customer = row.stripeCustomerId;
  else if (row.billingEmail) params.customer_email = row.billingEmail;
  // Keep what's left of the trial (Stripe needs at least 48 hours).
  if (row.status === "trialing" && row.trialEndsAt && row.trialEndsAt.getTime() - Date.now() > 2 * DAY_MS) {
    params["subscription_data[trial_end]"] = String(Math.floor(row.trialEndsAt.getTime() / 1000));
  }
  const session = await stripe<{ url: string }>("/v1/checkout/sessions", params);
  return { account: await getAccountSummary(), redirect: session.url, message: "Opening secure checkout…" };
}

/** Stripe's hosted page for updating the card, billing address and receipts. */
export async function paymentPortalUrl(origin: string) {
  if (!billingLive()) throw new PlanLimitError("Payment processing isn't set up on this site yet.");
  const row = await loadAccount();
  if (!row.stripeCustomerId) throw new PlanLimitError("Choose a paid plan first. You'll add a card at checkout.");
  const session = await stripe<{ url: string }>("/v1/billing_portal/sessions", {
    customer: row.stripeCustomerId,
    return_url: `${origin}/?settings=account`,
  });
  return session.url;
}

/** Copies a Stripe subscription (plan, dates, pause, card) into the account row. */
export async function syncSubscription(subscriptionId: string) {
  const sub = await stripe<StripeSubscription>(
    `/v1/subscriptions/${subscriptionId}?expand[]=default_payment_method`,
    undefined,
    "GET",
  );
  const item = sub.items.data[0];
  const mapped = item ? planFromPrice(item.price.id) : null;
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  let card = typeof sub.default_payment_method === "object" ? sub.default_payment_method?.card : undefined;
  if (!card) {
    const customer = await stripe<{ invoice_settings?: { default_payment_method: { card?: StripeCard } | null } }>(
      `/v1/customers/${sub.customer}?expand[]=invoice_settings.default_payment_method`,
      undefined,
      "GET",
    ).catch(() => null);
    card = customer?.invoice_settings?.default_payment_method?.card;
  }

  const ended = ["canceled", "incomplete_expired", "unpaid"].includes(sub.status);
  const status: AccountStatus = ended
    ? "canceled"
    : sub.pause_collection
      ? "paused"
      : sub.status === "trialing"
        ? "trialing"
        : "active";

  await loadAccount();
  await saveAccount({
    plan: ended ? "free" : (mapped?.plan ?? "free"),
    interval: mapped?.interval ?? "month",
    status,
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: ended ? "" : sub.id,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    currentPeriodEnd: !ended && periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: !ended && sub.cancel_at_period_end,
    pausedUntil: sub.pause_collection?.resumes_at ? new Date(sub.pause_collection.resumes_at * 1000) : null,
    ...(card ? { cardBrand: card.brand, cardLast4: card.last4, cardExpMonth: card.exp_month, cardExpYear: card.exp_year } : {}),
  });
}

/** Called when the owner comes back from Stripe Checkout. */
export async function completeCheckout(sessionId: string) {
  const session = await stripe<{ subscription: string | null; customer: string | null; metadata?: { plan?: string } }>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    undefined,
    "GET",
  );
  if (!session.subscription) throw new Error("Checkout didn't create a subscription");
  const before = await loadAccount();
  await syncSubscription(session.subscription);
  const after = await loadAccount();
  if (before.stripeSubscriptionId !== after.stripeSubscriptionId) {
    await logEvent("upgrade", `Subscribed to ${planById(after.plan).name} (${after.interval}ly)`);
  }
  return planById(after.plan).name;
}

/** Verifies and applies a Stripe webhook so changes made in Stripe (or failed payments) show up here. */
export async function handleStripeWebhook(payload: string, signature: string) {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  const parts = Object.fromEntries(signature.split(",").map((p) => p.split("=", 2) as [string, string]));
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const given = signature
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  const ok = given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
  if (!ok || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) throw new Error("Bad signature");

  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; subscription?: string } } };
  if (event.type.startsWith("customer.subscription.")) await syncSubscription(event.data.object.id);
  else if (event.type === "checkout.session.completed" && event.data.object.subscription)
    await syncSubscription(event.data.object.subscription);
  else if (event.type === "invoice.payment_failed") await logEvent("charge", "A payment failed. Update your card in Billing");
}
