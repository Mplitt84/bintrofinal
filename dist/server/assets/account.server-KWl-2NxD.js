import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, asc, count, desc } from "drizzle-orm";
import { h as db, G as billingEvents, H as account, m as movements, j as products, I as teamMembers } from "./auth.middleware-DMTTBk98.js";
const TRIAL_DAYS = 30;
const PLUS_FEATURES = ["orders", "calendar", "import", "ai", "insights", "square"];
const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Scan stock in and out, and see what’s running low.",
    monthlyCents: 0,
    yearlyCents: 0,
    productLimit: 150,
    teamLimit: 2,
    features: [],
    highlights: [
      "Scan in / out with camera or wand",
      "Up to 150 products",
      "Up to 2 team members",
      "Below-par list and activity history",
      "Barcode lookups from public product databases"
    ]
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Everything in Free, plus ordering, planning and AI help.",
    monthlyCents: 4900,
    yearlyCents: 49e3,
    productLimit: null,
    teamLimit: 10,
    features: PLUS_FEATURES,
    highlights: [
      "Unlimited products, up to 10 team members",
      "Vendor purchase orders to email, print or download",
      "Check deliveries in from an invoice photo, with vendor accuracy scores",
      "Business calendar with Google / Outlook sync",
      "Bulk import from CSV, PDF or photo",
      "Snap & log: photo the SKU or full label to add stock or scan it out",
      "AI label reading and price checks",
      "Weekly, monthly and fast-mover reports",
      "Square POS item and sales sync"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Everything in Plus, plus money management and your books.",
    monthlyCents: 9900,
    yearlyCents: 99e3,
    productLimit: null,
    teamLimit: null,
    features: [...PLUS_FEATURES, "budget", "quickbooks", "crm", "priority_support"],
    highlights: [
      "Unlimited team members",
      "Budget, expenses and AI receipt reading",
      "QuickBooks Online sync",
      "Client CRM connections (coming soon)",
      "Priority support"
    ]
  }
];
const FEATURE_INFO = {
  orders: {
    label: "Vendor orders & deliveries",
    blurb: "Turn the below-par list into vendor orders, then check each delivery in from a photo of the invoice. Shortages stay on order, costs update, and every vendor gets an accuracy score."
  },
  calendar: { label: "Business calendar", blurb: "Plan reorders, deliveries, counts, bills and tax dates, synced to Google or Outlook." },
  import: { label: "Bulk import", blurb: "Load a whole stock list or vendor invoice from a CSV, PDF or photo." },
  ai: {
    label: "AI help",
    blurb: "Snap & log: in a hurry, photograph the SKU or full label and Bintro finds the product so you can add it to stock or scan it out. Plus AI label reading for new products and price checks."
  },
  insights: { label: "Sales reports", blurb: "Best sellers, slow movers and fast-mover alerts, in the app and by email." },
  square: { label: "Square POS", blurb: "Import your Square item library and count sales out of stock automatically." },
  budget: { label: "Budget & expenses", blurb: "Track monthly spend against a budget, log expenses and read receipts with AI." },
  quickbooks: { label: "QuickBooks Online", blurb: "Send expenses and stock purchases to QuickBooks so your books match." },
  crm: { label: "Client CRM", blurb: "Connect your client list and booking tools." },
  priority_support: { label: "Priority support", blurb: "Jump the queue when you need help." }
};
function planById(id) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
function isPlanId(id) {
  return PLANS.some((p) => p.id === id);
}
function planFor(feature) {
  return PLANS.find((p) => p.features.includes(feature)) ?? PLANS[PLANS.length - 1];
}
function planHas(plan, feature) {
  return planById(plan).features.includes(feature);
}
function planRank(plan) {
  return PLANS.findIndex((p) => p.id === plan);
}
const FOUNDING_CENTS = {
  plus: { month: 2900, year: 29e3 },
  premium: { month: 6900, year: 69e3 }
};
function priceFor(plan, interval, founding = false) {
  if (founding && plan.id !== "free") return FOUNDING_CENTS[plan.id][interval];
  return interval === "year" ? plan.yearlyCents : plan.monthlyCents;
}
const PAUSE_OPTIONS = [1, 2, 3];
const CANCEL_REASONS = [
  "Too expensive",
  "Missing a feature I need",
  "Too hard to use",
  "Business is closing or seasonal",
  "Switching to another app",
  "Something else"
];
function centsLabel(cents) {
  if (!cents) return "Free";
  return `$${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`;
}
const ACCOUNT_ID = 1;
const DAY_MS = 24 * 60 * 60 * 1e3;
function env(name) {
  return process.env[name]?.trim() ?? "";
}
function pilotPremium() {
  const flag = env("BINTRO_PILOT_PREMIUM").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  const branch = env("BRANCH");
  return branch.toUpperCase() === "PILOT";
}
const PILOT_MONTHS = 18;
function pilotEndsAt(row) {
  if (!row.pilotStartedAt) return null;
  const end = new Date(row.pilotStartedAt);
  end.setMonth(end.getMonth() + PILOT_MONTHS);
  return end;
}
function pilotActive(row) {
  if (!pilotPremium() || row.pilotEndedAt) return false;
  const end = pilotEndsAt(row);
  return !end || end > /* @__PURE__ */ new Date();
}
async function firstScanIn() {
  const [first] = await db.select({ at: movements.createdAt }).from(movements).where(eq(movements.type, "in")).orderBy(asc(movements.createdAt)).limit(1);
  return first?.at ?? null;
}
const PILOT_MESSAGE = `Premium is included free during your ${PILOT_MONTHS}-month pilot, so there's nothing to change or pay yet.`;
function billingLive() {
  return Boolean(env("STRIPE_SECRET_KEY"));
}
function addInterval(from, interval, times = 1) {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + times);
  else d.setMonth(d.getMonth() + times);
  return d;
}
async function logEvent(kind, detail, amountCents = 0) {
  await db.insert(billingEvents).values({ kind, detail, amountCents });
}
async function saveAccount(values) {
  const [row] = await db.update(account).set({ ...values, updatedAt: /* @__PURE__ */ new Date() }).where(eq(account.id, ACCOUNT_ID)).returning();
  return row;
}
async function loadAccount() {
  const rows = await db.select().from(account).where(eq(account.id, ACCOUNT_ID));
  if (rows[0]) return settle(rows[0]);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS);
  await db.insert(account).values({ id: ACCOUNT_ID, plan: "premium", status: "trialing", trialEndsAt, currentPeriodEnd: trialEndsAt }).onConflictDoNothing();
  if (!pilotPremium()) await logEvent("trial", `Started a ${TRIAL_DAYS}-day Premium trial`);
  const [row] = await db.select().from(account).where(eq(account.id, ACCOUNT_ID));
  return settle(row);
}
async function settle(row) {
  const now = /* @__PURE__ */ new Date();
  if (pilotPremium() && !row.pilotEndedAt) {
    if (!row.pilotStartedAt) {
      const started = await firstScanIn();
      if (started) {
        row = await saveAccount({ pilotStartedAt: started });
        await logEvent("trial", `Pilot clock started: Premium free for ${PILOT_MONTHS} months from the first Scan In`);
      }
    }
    if (pilotActive(row)) {
      if (row.stripeSubscriptionId) return row;
      if (row.plan === "premium" && row.status === "active" && !row.trialEndsAt && !row.pausedUntil && !row.cancelAtPeriodEnd) return row;
      return saveAccount({
        plan: "premium",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: null,
        pausedUntil: null,
        cancelAtPeriodEnd: false,
        cancelReason: ""
      });
    }
    if (row.stripeSubscriptionId) {
      await logEvent("upgrade", `Pilot ended after ${PILOT_MONTHS} months. Founding rate started: ${planById(row.plan).name}`);
      return saveAccount({ pilotEndedAt: now });
    }
    await logEvent("downgrade", `Pilot ended after ${PILOT_MONTHS} months. Moved to Free`);
    return saveAccount({
      plan: "free",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: null,
      pausedUntil: null,
      cancelAtPeriodEnd: false,
      pilotEndedAt: now
    });
  }
  if (row.status === "trialing" && row.trialEndsAt && row.trialEndsAt <= now && !row.stripeSubscriptionId) {
    await logEvent("downgrade", "Premium trial ended. Moved to Free");
    return saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });
  }
  if (row.status === "paused" && row.pausedUntil && row.pausedUntil <= now) {
    await logEvent("resume", `${planById(row.plan).name} resumed after the pause`);
    return saveAccount({
      status: "active",
      pausedUntil: null,
      currentPeriodEnd: billingLive() ? row.currentPeriodEnd : addInterval(now, row.interval)
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
      stripeSubscriptionId: ""
    });
  }
  if (!billingLive() && row.status === "active" && row.plan !== "free" && row.currentPeriodEnd && row.currentPeriodEnd <= now) {
    let next = row.currentPeriodEnd;
    while (next <= now) next = addInterval(next, row.interval);
    return saveAccount({ currentPeriodEnd: next });
  }
  return row;
}
function effectivePlanOf(row) {
  if (pilotActive(row)) return "premium";
  if (row.status === "paused") return "free";
  return isPlanId(row.plan) ? row.plan : "free";
}
function summarize(row, usage) {
  return {
    plan: isPlanId(row.plan) ? row.plan : "free",
    effectivePlan: effectivePlanOf(row),
    interval: row.interval === "year" ? "year" : "month",
    status: row.status,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    pausedUntil: row.pausedUntil?.toISOString() ?? null,
    ownerName: row.ownerName,
    billingEmail: row.billingEmail,
    paymentMethod: row.cardLast4 ? { brand: row.cardBrand, last4: row.cardLast4, expMonth: row.cardExpMonth, expYear: row.cardExpYear } : null,
    billingLive: billingLive(),
    pilotPremium: pilotActive(row),
    pilotStartedAt: pilotActive(row) ? row.pilotStartedAt?.toISOString() ?? null : null,
    pilotEndsAt: pilotActive(row) ? pilotEndsAt(row)?.toISOString() ?? null : null,
    founding: pilotPremium(),
    lockedIn: pilotActive(row) && row.stripeSubscriptionId && isPlanId(row.plan) && row.plan !== "free" ? { plan: row.plan, interval: row.interval === "year" ? "year" : "month", startsAt: pilotEndsAt(row)?.toISOString() ?? null } : null,
    memberSince: row.createdAt.toISOString(),
    usage
  };
}
async function countUsage() {
  const [[p], [t]] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(teamMembers)
  ]);
  return { products: Number(p?.n ?? 0), team: Number(t?.n ?? 0) };
}
async function getAccountSummary() {
  const [row, usage] = await Promise.all([loadAccount(), countUsage()]);
  return summarize(row, usage);
}
async function currentPlan() {
  return effectivePlanOf(await loadAccount());
}
class PlanLimitError extends Error {
}
async function assertFeature(feature) {
  const plan = await currentPlan();
  if (!planHas(plan, feature)) {
    throw new PlanLimitError(
      `${FEATURE_INFO[feature].label} is part of Bintro ${planFor(feature).name}. Upgrade in Settings → Account & billing.`
    );
  }
}
async function hasFeature(feature) {
  return planHas(await currentPlan(), feature);
}
async function assertProductRoom(adding = 1) {
  const limit = planById(await currentPlan()).productLimit;
  if (limit === null) return;
  const { products: used } = await countUsage();
  if (used + adding > limit) {
    throw new PlanLimitError(`The Free plan holds up to ${limit} products. Upgrade to Plus for unlimited products.`);
  }
}
async function assertTeamRoom() {
  const plan = planById(await currentPlan());
  if (plan.teamLimit === null) return;
  const { team } = await countUsage();
  if (team + 1 > plan.teamLimit) {
    throw new PlanLimitError(
      `The ${plan.name} plan includes up to ${plan.teamLimit} team members. Upgrade to add more.`
    );
  }
}
async function updateAccountDetails(data) {
  await loadAccount();
  await saveAccount(data);
  if (billingLive() && data.billingEmail) {
    const row = await loadAccount();
    if (row.stripeCustomerId) await stripe(`/v1/customers/${row.stripeCustomerId}`, { email: data.billingEmail });
  }
  return getAccountSummary();
}
async function changePlan(target, interval, origin) {
  if (pilotActive(await loadAccount())) return { account: await getAccountSummary(), message: PILOT_MESSAGE };
  const row = await loadAccount();
  const plan = planById(target);
  const from = planById(row.plan);
  const upgrade = planRank(target) > planRank(from.id);
  if (target === "free") {
    if (row.status === "trialing" || row.plan === "free" || !row.currentPeriodEnd) {
      await saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, pausedUntil: null });
      await logEvent("downgrade", "Moved to Free");
      return { account: await getAccountSummary(), message: "You're on the Free plan" };
    }
    return cancelPlan("Moved to Free");
  }
  if (billingLive()) return changeStripePlan(row, target, interval, origin);
  const now = /* @__PURE__ */ new Date();
  await saveAccount({
    plan: target,
    interval,
    status: "active",
    trialEndsAt: null,
    pausedUntil: null,
    cancelAtPeriodEnd: false,
    cancelReason: "",
    currentPeriodEnd: addInterval(now, interval)
  });
  const verb = row.status === "trialing" ? "Chose" : upgrade ? "Upgraded to" : target === row.plan ? "Switched billing on" : "Changed to";
  await logEvent(
    upgrade ? "upgrade" : "downgrade",
    `${verb} ${plan.name} (${centsLabel(priceFor(plan, interval))}/${interval}). No charge in pilot mode`
  );
  return { account: await getAccountSummary(), message: `You're on ${plan.name}` };
}
async function pauseBilling(months) {
  if (pilotActive(await loadAccount())) return { account: await getAccountSummary(), message: PILOT_MESSAGE };
  const row = await loadAccount();
  if (row.plan === "free" || row.status === "trialing") {
    throw new PlanLimitError("Only paid plans can be paused.");
  }
  const until = addInterval(/* @__PURE__ */ new Date(), "month", months);
  if (billingLive() && row.stripeSubscriptionId) {
    await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, {
      "pause_collection[behavior]": "void",
      "pause_collection[resumes_at]": String(Math.floor(until.getTime() / 1e3))
    });
  }
  await saveAccount({ status: "paused", pausedUntil: until, cancelAtPeriodEnd: false });
  await logEvent("pause", `Paused ${planById(row.plan).name} for ${months} month${months === 1 ? "" : "s"}`);
  return {
    account: await getAccountSummary(),
    message: `Billing paused until ${until.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  };
}
async function resumeBilling() {
  if (pilotActive(await loadAccount())) return { account: await getAccountSummary(), message: PILOT_MESSAGE };
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
    currentPeriodEnd: !billingLive() && wasPaused ? addInterval(/* @__PURE__ */ new Date(), row.interval) : void 0
  });
  await logEvent(wasPaused ? "resume" : "reactivate", `${wasPaused ? "Resumed" : "Kept"} ${planById(row.plan).name}`);
  return { account: await getAccountSummary(), message: `${planById(row.plan).name} is back on` };
}
async function cancelPlan(reason) {
  const current = await loadAccount();
  if (pilotActive(current)) {
    if (!current.stripeSubscriptionId) return { account: await getAccountSummary(), message: PILOT_MESSAGE };
    if (billingLive()) await stripe(`/v1/subscriptions/${current.stripeSubscriptionId}`, void 0, "DELETE");
    await saveAccount({ stripeSubscriptionId: "", plan: "premium", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });
    await logEvent("cancel", `Undid the founding rate lock-in${reason ? ` (${reason})` : ""}`);
    return { account: await getAccountSummary(), message: "Lock-in undone. Your pilot carries on as before" };
  }
  const row = await loadAccount();
  const name = planById(row.plan).name;
  if (row.plan === "free") throw new PlanLimitError("You're already on the Free plan.");
  if (row.status === "trialing" && !row.stripeSubscriptionId) {
    await saveAccount({ plan: "free", status: "active", trialEndsAt: null, currentPeriodEnd: null, cancelReason: reason });
    await logEvent("cancel", `Ended the ${name} trial${reason ? ` (${reason})` : ""}`);
    return { account: await getAccountSummary(), message: "Trial ended. You're on the Free plan" };
  }
  if (billingLive() && row.stripeSubscriptionId) {
    await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, {
      cancel_at_period_end: "true",
      pause_collection: "",
      "cancellation_details[comment]": reason.slice(0, 500)
    });
  }
  const end = row.currentPeriodEnd ?? /* @__PURE__ */ new Date();
  await saveAccount({
    status: row.status === "paused" ? "active" : row.status,
    pausedUntil: null,
    cancelAtPeriodEnd: true,
    cancelReason: reason,
    currentPeriodEnd: end
  });
  await logEvent("cancel", `Canceled ${name}${reason ? ` (${reason})` : ""}. Access until the period ends`);
  return {
    account: await getAccountSummary(),
    message: `${name} canceled. It stays on until ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  };
}
async function listBillingHistory() {
  const rows = await db.select().from(billingEvents).orderBy(desc(billingEvents.createdAt)).limit(30);
  const events = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    detail: r.detail,
    amountCents: r.amountCents,
    createdAt: r.createdAt.toISOString()
  }));
  if (billingLive()) {
    const row = await loadAccount();
    if (row.stripeCustomerId) {
      try {
        const invoices = await stripe(
          `/v1/invoices?customer=${encodeURIComponent(row.stripeCustomerId)}&limit=12`,
          void 0,
          "GET"
        );
        invoices.data.filter((i) => i.status === "paid" || i.status === "open").forEach(
          (i, n) => events.push({
            id: -1 - n,
            kind: "charge",
            detail: `Invoice ${i.number ?? ""}${i.status === "open" ? " (unpaid)" : ""}`.trim(),
            amountCents: i.status === "paid" ? i.amount_paid : i.amount_due,
            createdAt: new Date(i.created * 1e3).toISOString(),
            url: i.hosted_invoice_url ?? void 0
          })
        );
      } catch (error) {
        console.error("Couldn't load Stripe invoices", error);
      }
    }
  }
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function stripe(path, params, method = "POST") {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      ...method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
    },
    body: method === "POST" && params ? new URLSearchParams(params).toString() : void 0
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe request failed (${res.status})`);
  return json;
}
const PRICE_ENV = {
  plus: { month: "STRIPE_PRICE_PLUS_MONTHLY", year: "STRIPE_PRICE_PLUS_YEARLY" },
  premium: { month: "STRIPE_PRICE_PREMIUM_MONTHLY", year: "STRIPE_PRICE_PREMIUM_YEARLY" }
};
function stripePrice(plan, interval) {
  const id = env(PRICE_ENV[plan][interval]);
  if (!id) throw new Error(`Add ${PRICE_ENV[plan][interval]} in Netlify to sell ${planById(plan).name} ${interval}ly.`);
  return id;
}
function planFromPrice(priceId) {
  for (const plan of ["plus", "premium"]) {
    for (const interval of ["month", "year"]) {
      if (env(PRICE_ENV[plan][interval]) === priceId) return { plan, interval };
    }
  }
  return null;
}
async function changeStripePlan(row, target, interval, origin) {
  const price = stripePrice(target, interval);
  const name = planById(target).name;
  if (row.stripeSubscriptionId) {
    const sub = await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, void 0, "GET");
    await stripe(`/v1/subscriptions/${sub.id}`, {
      "items[0][id]": sub.items.data[0].id,
      "items[0][price]": price,
      proration_behavior: "create_prorations",
      cancel_at_period_end: "false",
      pause_collection: ""
    });
    await syncSubscription(sub.id);
    await logEvent(planRank(target) > planRank(row.plan) ? "upgrade" : "downgrade", `Changed to ${name} (${interval}ly)`);
    return { account: await getAccountSummary(), message: `You're on ${name}` };
  }
  const params = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?settings=account&billing=canceled`,
    allow_promotion_codes: "true",
    "metadata[plan]": target
  };
  if (row.stripeCustomerId) params.customer = row.stripeCustomerId;
  else if (row.billingEmail) params.customer_email = row.billingEmail;
  if (row.status === "trialing" && row.trialEndsAt && row.trialEndsAt.getTime() - Date.now() > 2 * DAY_MS) {
    params["subscription_data[trial_end]"] = String(Math.floor(row.trialEndsAt.getTime() / 1e3));
  }
  const session = await stripe("/v1/checkout/sessions", params);
  return { account: await getAccountSummary(), redirect: session.url, message: "Opening secure checkout…" };
}
async function lockInFoundingRate(target, interval, origin) {
  const row = await loadAccount();
  if (!pilotActive(row)) throw new PlanLimitError("The founding rate lock-in is for pilot testers during their pilot.");
  if (!billingLive()) throw new PlanLimitError("Payments aren't switched on for the pilot yet. The founding rate opens here before your pilot ends.");
  const end = pilotEndsAt(row);
  if (!end) throw new PlanLimitError(`Your ${PILOT_MONTHS} free months start with your first Scan In. Scan something in, then lock in your rate.`);
  const price = stripePrice(target, interval);
  const name = planById(target).name;
  const when = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (row.stripeSubscriptionId) {
    const sub = await stripe(`/v1/subscriptions/${row.stripeSubscriptionId}`, void 0, "GET");
    await stripe(`/v1/subscriptions/${sub.id}`, { "items[0][id]": sub.items.data[0].id, "items[0][price]": price, proration_behavior: "none" });
    await syncSubscription(sub.id);
    await logEvent("upgrade", `Changed the founding rate lock-in to ${name} (${interval}ly)`);
    return { account: await getAccountSummary(), message: `Locked in ${name}. Nothing is charged until ${when}` };
  }
  const params = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?settings=account&billing=canceled`,
    "metadata[plan]": target,
    "metadata[founding]": "true",
    "custom_text[submit][message]": `Founding rate for pilot testers. You won't be charged until your free pilot ends on ${when}.`
  };
  if (row.stripeCustomerId) params.customer = row.stripeCustomerId;
  else if (row.billingEmail) params.customer_email = row.billingEmail;
  if (end.getTime() - Date.now() > 2 * DAY_MS) params["subscription_data[trial_end]"] = String(Math.floor(end.getTime() / 1e3));
  const session = await stripe("/v1/checkout/sessions", params);
  return { account: await getAccountSummary(), redirect: session.url, message: "Opening secure checkout…" };
}
async function paymentPortalUrl(origin) {
  if (!billingLive()) throw new PlanLimitError("Payment processing isn't set up on this site yet.");
  const row = await loadAccount();
  if (!row.stripeCustomerId) throw new PlanLimitError("Choose a paid plan first. You'll add a card at checkout.");
  const session = await stripe("/v1/billing_portal/sessions", {
    customer: row.stripeCustomerId,
    return_url: `${origin}/?settings=account`
  });
  return session.url;
}
async function syncSubscription(subscriptionId) {
  const sub = await stripe(
    `/v1/subscriptions/${subscriptionId}?expand[]=default_payment_method`,
    void 0,
    "GET"
  );
  const item = sub.items.data[0];
  const mapped = item ? planFromPrice(item.price.id) : null;
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  let card = typeof sub.default_payment_method === "object" ? sub.default_payment_method?.card : void 0;
  if (!card) {
    const customer = await stripe(
      `/v1/customers/${sub.customer}?expand[]=invoice_settings.default_payment_method`,
      void 0,
      "GET"
    ).catch(() => null);
    card = customer?.invoice_settings?.default_payment_method?.card;
  }
  const ended = ["canceled", "incomplete_expired", "unpaid"].includes(sub.status);
  const status = ended ? "canceled" : sub.pause_collection ? "paused" : sub.status === "trialing" ? "trialing" : "active";
  await loadAccount();
  await saveAccount({
    plan: ended ? "free" : mapped?.plan ?? "free",
    interval: mapped?.interval ?? "month",
    status,
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: ended ? "" : sub.id,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1e3) : null,
    currentPeriodEnd: !ended && periodEnd ? new Date(periodEnd * 1e3) : null,
    cancelAtPeriodEnd: !ended && sub.cancel_at_period_end,
    pausedUntil: sub.pause_collection?.resumes_at ? new Date(sub.pause_collection.resumes_at * 1e3) : null,
    ...card ? { cardBrand: card.brand, cardLast4: card.last4, cardExpMonth: card.exp_month, cardExpYear: card.exp_year } : {}
  });
}
async function completeCheckout(sessionId) {
  const session = await stripe(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    void 0,
    "GET"
  );
  if (!session.subscription) throw new Error("Checkout didn't create a subscription");
  const before = await loadAccount();
  await syncSubscription(session.subscription);
  const after = await loadAccount();
  if (before.stripeSubscriptionId !== after.stripeSubscriptionId) {
    const end = pilotActive(after) ? pilotEndsAt(after) : null;
    await logEvent(
      "upgrade",
      end ? `Locked in the founding rate: ${planById(after.plan).name} (${after.interval}ly), starting ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : `Subscribed to ${planById(after.plan).name} (${after.interval}ly)`
    );
  }
  return planById(after.plan).name;
}
async function handleStripeWebhook(payload, signature) {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  const parts = Object.fromEntries(signature.split(",").map((p) => p.split("=", 2)));
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const given = signature.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const ok = given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
  if (!ok || Math.abs(Date.now() / 1e3 - Number(parts.t)) > 300) throw new Error("Bad signature");
  const event = JSON.parse(payload);
  if (event.type.startsWith("customer.subscription.")) await syncSubscription(event.data.object.id);
  else if (event.type === "checkout.session.completed" && event.data.object.subscription)
    await syncSubscription(event.data.object.subscription);
  else if (event.type === "invoice.payment_failed") await logEvent("charge", "A payment failed. Update your card in Billing");
}
async function stripeCheck() {
  const key = env("STRIPE_SECRET_KEY");
  const secretKey = !key ? "missing" : key.startsWith("sk_test_") ? "test" : key.startsWith("sk_live_") ? "live" : key.startsWith("rk_") ? "restricted" : "invalid";
  let account2 = "";
  if (key && secretKey !== "invalid") {
    try {
      const acct = await stripe("/v1/account", void 0, "GET");
      account2 = acct.settings?.dashboard?.display_name || acct.email || "connected";
    } catch (error) {
      account2 = "";
      console.error("Stripe setup check failed", error);
    }
  }
  const prices = [];
  for (const plan of ["plus", "premium"]) {
    for (const interval of ["month", "year"]) {
      const name = PRICE_ENV[plan][interval];
      const id = env(name);
      const p = planById(plan);
      const expectedCents = priceFor(p, interval, pilotPremium());
      const row = { env: name, plan: p.name, interval, expectedCents, status: "missing", detail: "" };
      if (id && key && account2) {
        try {
          const price = await stripe(
            `/v1/prices/${encodeURIComponent(id)}`,
            void 0,
            "GET"
          );
          const okInterval = price.recurring?.interval === interval;
          const okAmount = price.unit_amount === expectedCents && price.currency === "usd";
          row.status = price.active && okInterval && okAmount ? "ok" : "mismatch";
          row.detail = !price.active ? "This price is archived in Stripe." : !okInterval ? `Stripe bills it every ${price.recurring?.interval ?? "one time"}, not every ${interval}.` : !okAmount ? `Stripe has $${((price.unit_amount ?? 0) / 100).toFixed(2)} ${price.currency.toUpperCase()}; the app shows $${(expectedCents / 100).toFixed(2)}.` : "";
        } catch (error) {
          row.status = "error";
          row.detail = error instanceof Error ? error.message : "Stripe couldn't find this price.";
        }
      } else if (id) {
        row.status = "error";
        row.detail = "Set a working STRIPE_SECRET_KEY first.";
      }
      prices.push(row);
    }
  }
  if (key && !account2 && secretKey !== "invalid") return { secretKey: "invalid", account: account2, webhookSecret: Boolean(env("STRIPE_WEBHOOK_SECRET")), prices };
  return { secretKey, account: account2, webhookSecret: Boolean(env("STRIPE_WEBHOOK_SECRET")), prices };
}
export {
  CANCEL_REASONS as C,
  FEATURE_INFO as F,
  PAUSE_OPTIONS as P,
  hasFeature as a,
  assertProductRoom as b,
  completeCheckout as c,
  assertFeature as d,
  PlanLimitError as e,
  lockInFoundingRate as f,
  getAccountSummary as g,
  handleStripeWebhook as h,
  cancelPlan as i,
  paymentPortalUrl as j,
  changePlan as k,
  listBillingHistory as l,
  assertTeamRoom as m,
  pilotPremium as n,
  planById as o,
  pauseBilling as p,
  planHas as q,
  resumeBilling as r,
  stripeCheck as s,
  planFor as t,
  updateAccountDetails as u,
  centsLabel as v,
  priceFor as w,
  PLANS as x,
  planRank as y
};
